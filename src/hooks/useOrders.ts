import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CartItem } from '../context/CartContext';
import { triggerWhatsAppNotification } from '../lib/whatsapp';

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_uses?: number;
  used_count: number;
  expires_at?: string;
  active: boolean;
}

export interface OrderData {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_cpf?: string;
  address_zip: string;
  address_street: string;
  address_number: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city: string;
  address_state: string;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_method: 'pix' | 'card' | 'infinitepay';
  shipping_method: string;
  coupon_id?: string;
  user_id?: string;
}

export function useOrders() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = useCallback(async (code: string, cartTotal: number): Promise<Coupon | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('active', true)
        .single();

      if (err) {
        if (err.code === 'PGRST116') {
          // No row found
          throw new Error('Cupom não encontrado ou inativo.');
        }
        throw err;
      }

      const coupon = data as Coupon;

      // Validate expiration
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error('Este cupom já expirou.');
      }

      // Validate usage limits
      if (coupon.max_uses !== undefined && coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        throw new Error('Este cupom atingiu o limite máximo de usos.');
      }

      // Validate minimum order value
      if (coupon.min_order_value && cartTotal < coupon.min_order_value) {
        throw new Error(`Este cupom exige um valor mínimo de compra de R$ ${coupon.min_order_value.toFixed(2)}.`);
      }

      return coupon;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao validar cupom';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (orderInfo: OrderData, cartItems: CartItem[]): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Insert order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: orderInfo.user_id || null,
          customer_name: orderInfo.customer_name,
          customer_email: orderInfo.customer_email,
          customer_phone: orderInfo.customer_phone || null,
          customer_cpf: orderInfo.customer_cpf || null,
          address_zip: orderInfo.address_zip,
          address_street: orderInfo.address_street,
          address_number: orderInfo.address_number,
          address_complement: orderInfo.address_complement || null,
          address_neighborhood: orderInfo.address_neighborhood || null,
          address_city: orderInfo.address_city,
          address_state: orderInfo.address_state,
          subtotal: orderInfo.subtotal,
          discount_amount: orderInfo.discount_amount,
          shipping_amount: orderInfo.shipping_amount,
          total_amount: orderInfo.total_amount,
          payment_method: orderInfo.payment_method,
          shipping_method: orderInfo.shipping_method,
          coupon_id: orderInfo.coupon_id || null,
          status: 'pending'
        })
        .select()
        .single();

      if (orderErr) throw orderErr;
      if (!orderData) throw new Error('Falha ao criar o registro do pedido.');

      const orderId = orderData.id as string;

      // 2. Insert order items
      const itemsToInsert = cartItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        variation_id: item.variationId || null,
        product_name: item.customization 
          ? `${item.name} (NOME: ${item.customization.name.toUpperCase()}, NÚMERO: ${item.customization.number})` 
          : item.name,
        size: item.size,
        sku: item.customization ? `${item.sku}-CUSTOM` : item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        image_url: item.image || null
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      // 3. Decrement stock for each item's variation
      for (const item of cartItems) {
        if (item.variationId) {
          // Fetch current stock
          const { data: varData } = await supabase
            .from('product_variations')
            .select('stock')
            .eq('id', item.variationId)
            .single();

          if (varData) {
            const currentStock = varData.stock as number;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            await supabase
              .from('product_variations')
              .update({ stock: newStock })
              .eq('id', item.variationId);

            // If stock goes to zero, trigger stock out notification
            if (newStock === 0) {
              const { data: prodData } = await supabase
                .from('products')
                .select('name, sku')
                .eq('id', item.productId)
                .single();
              
              if (prodData) {
                triggerWhatsAppNotification('stock_out', {
                  product: prodData,
                  size: item.size,
                  sku: `${prodData.sku}-${item.size}`
                });
              }
            }
          }
        }
      }

      // 4. Increment coupon usage count if applied
      if (orderInfo.coupon_id) {
        const { data: cpData } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('id', orderInfo.coupon_id)
          .single();
        
        if (cpData) {
          await supabase
            .from('coupons')
            .update({ used_count: (cpData.used_count || 0) + 1 })
            .eq('id', orderInfo.coupon_id);
        }
      }

      // 5. Trigger WhatsApp notification for the new order
      triggerWhatsAppNotification('order_created', { order: orderData });

      return orderId;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao finalizar o pedido';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrderDetails = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderErr) throw orderErr;
      if (!orderData) return null;

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsErr) throw itemsErr;

      return {
        ...orderData,
        items: itemsData || []
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao recuperar detalhes do pedido';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOrderStatus = useCallback(async (orderId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
        
      if (err) throw err;
      return data?.status as string || null;
    } catch (err) {
      console.error('Error checking order status:', err);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    validateCoupon,
    createOrder,
    getOrderDetails,
    checkOrderStatus
  };
}
