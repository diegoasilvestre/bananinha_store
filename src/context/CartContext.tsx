import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface CartItem {
  productId: string;
  variationId?: string;
  name: string;
  size: string;
  sku: string;
  quantity: number;
  price: number;
  image: string;
  customization?: {
    name: string;
    number: string;
  };
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (productId: string, size: string, customization?: { name: string; number: string }) => void;
  updateQuantity: (productId: string, size: string, quantity: number, customization?: { name: string; number: string }) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper functions for mapping to and from Supabase DB structure
const mapDbItemToCartItem = (dbItem: any): CartItem => ({
  productId: dbItem.product_id,
  variationId: dbItem.variation_id || undefined,
  name: dbItem.name,
  size: dbItem.size,
  sku: dbItem.sku,
  quantity: dbItem.quantity,
  price: Number(dbItem.price),
  image: dbItem.image,
  customization: dbItem.custom_name || dbItem.custom_number ? {
    name: dbItem.custom_name || '',
    number: dbItem.custom_number || ''
  } : undefined
});

const mapCartItemToDbRow = (item: CartItem, userId: string) => ({
  user_id: userId,
  product_id: item.productId,
  variation_id: item.variationId || null,
  name: item.name,
  sku: item.sku,
  price: item.price,
  image: item.image,
  size: item.size,
  quantity: item.quantity,
  custom_name: item.customization?.name || null,
  custom_number: item.customization?.number || null
});

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);

  // Fetch cart items from Supabase
  const fetchDbCart = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return (data || []).map(mapDbItemToCartItem);
    } catch (e) {
      console.error('Failed to fetch cart from Supabase:', e);
      return [];
    }
  };

  // Merge localStorage cart items to database on login
  const mergeLocalCartToDb = async (userId: string, localCart: CartItem[]) => {
    try {
      const dbCart = await fetchDbCart(userId);
      
      for (const localItem of localCart) {
        const existingDbItem = dbCart.find(dbItem => 
          dbItem.productId === localItem.productId && 
          dbItem.size === localItem.size &&
          dbItem.customization?.name === localItem.customization?.name &&
          dbItem.customization?.number === localItem.customization?.number
        );
        
        if (existingDbItem) {
          const newQty = existingDbItem.quantity + localItem.quantity;
          await supabase
            .from('cart_items')
            .update({ quantity: newQty })
            .eq('user_id', userId)
            .eq('product_id', localItem.productId)
            .eq('size', localItem.size)
            .eq('custom_name', localItem.customization?.name || null)
            .eq('custom_number', localItem.customization?.number || null);
        } else {
          const row = mapCartItemToDbRow(localItem, userId);
          await supabase
            .from('cart_items')
            .insert(row);
        }
      }
      
      // Clean guest cart
      localStorage.removeItem('bananinha_cart');
    } catch (e) {
      console.error('Failed to merge local cart to database:', e);
    }
  };

  // Synchronize cart state depending on auth state
  useEffect(() => {
    if (authLoading) return;

    const syncCart = async () => {
      if (user) {
        const stored = localStorage.getItem('bananinha_cart');
        if (stored) {
          try {
            const localCart = JSON.parse(stored) as CartItem[];
            if (localCart.length > 0) {
              await mergeLocalCartToDb(user.id, localCart);
            }
          } catch (e) {
            console.error('Failed to parse local cart for merge:', e);
          }
        }
        const dbItems = await fetchDbCart(user.id);
        setCart(dbItems);
      } else {
        try {
          const stored = localStorage.getItem('bananinha_cart');
          if (stored) {
            setCart(JSON.parse(stored));
          } else {
            setCart([]);
          }
        } catch (e) {
          console.error('Failed to parse cart from localStorage:', e);
          setCart([]);
        }
      }
    };

    syncCart();
  }, [user, authLoading]);

  const addToCart = async (newItem: Omit<CartItem, 'quantity'>, quantity: number) => {
    const existingIndex = cart.findIndex(
      (item) => 
        item.productId === newItem.productId && 
        item.size === newItem.size &&
        item.customization?.name === newItem.customization?.name &&
        item.customization?.number === newItem.customization?.number
    );

    let updatedCart = [...cart];

    if (existingIndex > -1) {
      const newQty = updatedCart[existingIndex].quantity + quantity;
      updatedCart[existingIndex].quantity = newQty;
      
      if (user) {
        try {
          await supabase
            .from('cart_items')
            .update({ quantity: newQty })
            .eq('user_id', user.id)
            .eq('product_id', newItem.productId)
            .eq('size', newItem.size)
            .eq('custom_name', newItem.customization?.name || null)
            .eq('custom_number', newItem.customization?.number || null);
        } catch (e) {
          console.error('Failed to update item quantity in Supabase:', e);
        }
      }
    } else {
      const itemToAdd = { ...newItem, quantity };
      updatedCart.push(itemToAdd);
      
      if (user) {
        try {
          const row = mapCartItemToDbRow(itemToAdd, user.id);
          await supabase
            .from('cart_items')
            .insert(row);
        } catch (e) {
          console.error('Failed to insert item to Supabase:', e);
        }
      }
    }

    setCart(updatedCart);
    if (!user) {
      try {
        localStorage.setItem('bananinha_cart', JSON.stringify(updatedCart));
      } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
      }
    }
    setCartOpen(true);
  };

  const removeFromCart = async (productId: string, size: string, customization?: { name: string; number: string }) => {
    const updatedCart = cart.filter(
      (item) => !(
        item.productId === productId && 
        item.size === size && 
        item.customization?.name === customization?.name && 
        item.customization?.number === customization?.number
      )
    );

    setCart(updatedCart);

    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .eq('size', size)
          .eq('custom_name', customization?.name || null)
          .eq('custom_number', customization?.number || null);
      } catch (e) {
        console.error('Failed to delete item from Supabase:', e);
      }
    } else {
      try {
        localStorage.setItem('bananinha_cart', JSON.stringify(updatedCart));
      } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
      }
    }
  };

  const updateQuantity = async (
    productId: string, 
    size: string, 
    quantity: number, 
    customization?: { name: string; number: string }
  ) => {
    if (quantity <= 0) {
      await removeFromCart(productId, size, customization);
      return;
    }

    const updatedCart = cart.map((item) =>
      item.productId === productId && 
      item.size === size && 
      item.customization?.name === customization?.name && 
      item.customization?.number === customization?.number
        ? { ...item, quantity }
        : item
    );

    setCart(updatedCart);

    if (user) {
      try {
        await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .eq('size', size)
          .eq('custom_name', customization?.name || null)
          .eq('custom_number', customization?.number || null);
      } catch (e) {
        console.error('Failed to update item quantity in Supabase:', e);
      }
    } else {
      try {
        localStorage.setItem('bananinha_cart', JSON.stringify(updatedCart));
      } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
      }
    }
  };

  const clearCart = async () => {
    setCart([]);
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
      } catch (e) {
        console.error('Failed to clear cart in Supabase:', e);
      }
    } else {
      try {
        localStorage.removeItem('bananinha_cart');
      } catch (e) {
        console.error('Failed to clear cart from localStorage:', e);
      }
    }
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        isCartOpen,
        setCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
