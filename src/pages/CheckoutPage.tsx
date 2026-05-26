import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ShoppingBag, ChevronRight, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useOrders';

const checkoutSchema = z.object({
  customerName: z.string().min(3, { message: 'O nome completo deve ter no mínimo 3 caracteres.' }),
  customerEmail: z.string().email({ message: 'Insira um e-mail válido.' }),
  customerPhone: z.string().min(10, { message: 'O telefone deve conter o DDD e pelo menos 8 dígitos.' }),
  customerCpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF inválido (use o formato 000.000.000-00 ou apenas números).' }),
  addressZip: z.string().regex(/^\d{5}-?\d{3}$/, { message: 'CEP inválido (formato 00000-000).' }),
  addressStreet: z.string().min(2, { message: 'Informe a rua.' }),
  addressNumber: z.string().min(1, { message: 'Informe o número.' }),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(2, { message: 'Informe o bairro.' }),
  addressCity: z.string().min(2, { message: 'Informe a cidade.' }),
  addressState: z.string().length(2, { message: 'Use a sigla do estado com 2 letras (ex: SP).' }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { createOrder, validateCoupon, error: apiError, loading } = useOrders();

  // Form states
  const [formData, setFormData] = useState<Partial<CheckoutFormValues>>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCpf: '',
    addressZip: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  
  // Checkout options
  const [shippingMethod, setShippingMethod] = useState<'sedex' | 'pac'>('pac');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; type: string; value: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Auto-fill email if user is logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({ ...prev, customerEmail: user.email || '' }));
    }
  }, [user]);

  // Calculate pricing values
  const shippingAmount = cartTotal >= 299 ? 0 : shippingMethod === 'sedex' ? 25.00 : 15.00;
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = (cartTotal * appliedCoupon.value) / 100;
    } else {
      discountAmount = appliedCoupon.value;
    }
  }

  const finalTotalAmount = Math.max(0, cartTotal + shippingAmount - discountAmount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on edit
    if (formErrors[name as keyof CheckoutFormValues]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleApplyCoupon = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponLoading(true);

    const coupon = await validateCoupon(couponCode, cartTotal);
    setCouponLoading(false);

    if (coupon) {
      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        type: coupon.discount_type,
        value: coupon.discount_value,
      });
      setCouponCode('');
    } else {
      setCouponError('Cupom inválido, expirado ou abaixo do valor mínimo.');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Sua sacola está vazia!');
      return;
    }

    // Validate form values with Zod
    const validation = checkoutSchema.safeParse(formData);

    if (!validation.success) {
      const errors: Partial<Record<keyof CheckoutFormValues, string>> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CheckoutFormValues;
        errors[field] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    const validatedData = validation.data;

    // Create order request structure
    const orderData: any = {
      customer_name: validatedData.customerName,
      customer_email: validatedData.customerEmail,
      customer_phone: validatedData.customerPhone,
      customer_cpf: validatedData.customerCpf,
      address_zip: validatedData.addressZip,
      address_street: validatedData.addressStreet,
      address_number: validatedData.addressNumber,
      address_complement: validatedData.addressComplement,
      address_neighborhood: validatedData.addressNeighborhood,
      address_city: validatedData.addressCity,
      address_state: validatedData.addressState.toUpperCase(),
      subtotal: cartTotal,
      discount_amount: discountAmount,
      shipping_amount: shippingAmount,
      total_amount: finalTotalAmount,
      payment_method: 'infinitepay',
      shipping_method: shippingMethod === 'sedex' ? 'Correios SEDEX' : 'Correios PAC',
      coupon_id: appliedCoupon?.id,
      user_id: user?.id,
    };

    const createdOrderId = await createOrder(orderData, cart);

    if (createdOrderId) {
      setCheckoutError(null);
      
      try {
        // A safer way is to just pass a single aggregated item to avoid sum/discount validation errors.
        const aggregatedItems = [
          {
            description: 'Pedido Bananinha Store',
            price: Math.round(finalTotalAmount * 100),
            quantity: 1
          }
        ];

        const cleanPhone = validatedData.customerPhone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

        const linkPayload = {
          order_nsu: createdOrderId,
          items: aggregatedItems,
          customer: {
            name: validatedData.customerName,
            email: validatedData.customerEmail,
            phone_number: formattedPhone
          }
        };

        const response = await fetch('/api/infinitepay/create-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(linkPayload)
        });

        const data = await response.json();
        
        if (response.ok && data.url) {
          clearCart();
          window.location.href = data.url;
        } else {
          console.error('Failed to create InfinitePay link:', data);
          const errorMsg = data.error || (data.details && JSON.stringify(data.details)) || 'Erro desconhecido.';
          setCheckoutError(`Erro ao gerar link de pagamento na InfinitePay: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error('Error in InfinitePay flow:', err);
        setCheckoutError(`Falha de rede ao conectar com a InfinitePay: ${err.message || err}`);
      }
    }
  };

  return (
    <div className="flex-grow bg-cinza-claro/50 min-h-screen py-10">
      <div className="wrapper-global">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs text-cinza-escuro font-light mb-8">
          <Link to="/" className="hover:text-verde-medio transition-smooth">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-verde-medio transition-smooth">Camisetas</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-preto font-semibold">Finalizar Compra</span>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20 bg-branco rounded-lg border border-cinza-claro space-y-4">
            <ShoppingBag className="h-16 w-16 text-cinza-escuro/30 mx-auto" />
            <h2 className="font-heading text-2xl text-preto">Sua sacola está vazia</h2>
            <p className="text-sm text-cinza-escuro font-light">Adicione camisetas para finalizar sua compra.</p>
            <Link to="/products" className="bg-verde-escuro hover:bg-verde-medio text-branco px-8 py-3 rounded font-semibold tracking-wider inline-block transition-smooth">
              VER CAMISETAS
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Col: Personal data and delivery details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Data Card */}
              <div className="bg-branco p-6 rounded-lg border border-cinza-claro space-y-6 shadow-xs">
                <h2 className="font-heading text-xl text-preto border-b border-cinza-claro pb-3">1. DADOS PESSOAIS</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="customerName">Nome Completo *</label>
                    <input
                      id="customerName"
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.customerName ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.customerName && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.customerName}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="customerEmail">E-mail *</label>
                    <input
                      id="customerEmail"
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.customerEmail ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.customerEmail && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.customerEmail}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="customerPhone">Telefone / WhatsApp *</label>
                    <input
                      id="customerPhone"
                      type="text"
                      name="customerPhone"
                      placeholder="(11) 99999-9999"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.customerPhone ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.customerPhone && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.customerPhone}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="customerCpf">CPF *</label>
                    <input
                      id="customerCpf"
                      type="text"
                      name="customerCpf"
                      placeholder="000.000.000-00"
                      value={formData.customerCpf}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.customerCpf ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.customerCpf && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.customerCpf}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="bg-branco p-6 rounded-lg border border-cinza-claro space-y-6 shadow-xs">
                <h2 className="font-heading text-xl text-preto border-b border-cinza-claro pb-3">2. ENDEREÇO DE ENTREGA</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressZip">CEP *</label>
                    <input
                      id="addressZip"
                      type="text"
                      name="addressZip"
                      placeholder="00000-000"
                      value={formData.addressZip}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.addressZip ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.addressZip && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.addressZip}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressStreet">Rua *</label>
                    <input
                      id="addressStreet"
                      type="text"
                      name="addressStreet"
                      value={formData.addressStreet}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.addressStreet ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.addressStreet && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.addressStreet}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressNumber">Número *</label>
                    <input
                      id="addressNumber"
                      type="text"
                      name="addressNumber"
                      value={formData.addressNumber}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.addressNumber ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.addressNumber && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.addressNumber}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressComplement">Complemento</label>
                    <input
                      id="addressComplement"
                      type="text"
                      name="addressComplement"
                      value={formData.addressComplement}
                      onChange={handleInputChange}
                      className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressNeighborhood">Bairro *</label>
                    <input
                      id="addressNeighborhood"
                      type="text"
                      name="addressNeighborhood"
                      value={formData.addressNeighborhood}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.addressNeighborhood ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.addressNeighborhood && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.addressNeighborhood}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressCity">Cidade *</label>
                    <input
                      id="addressCity"
                      type="text"
                      name="addressCity"
                      value={formData.addressCity}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.addressCity ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.addressCity && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.addressCity}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-cinza-escuro block" htmlFor="addressState">Estado (UF) *</label>
                    <input
                      id="addressState"
                      type="text"
                      name="addressState"
                      maxLength={2}
                      placeholder="SP"
                      value={formData.addressState}
                      onChange={handleInputChange}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.addressState ? 'border-vermelho-alerta focus:ring-vermelho-alerta' : 'border-cinza-claro focus:ring-verde-medio'}`}
                    />
                    {formErrors.addressState && <p className="text-[10px] text-vermelho-alerta font-medium">{formErrors.addressState}</p>}
                  </div>
                </div>
              </div>

              {/* Shipping Method Card */}
              <div className="bg-branco p-6 rounded-lg border border-cinza-claro space-y-4 shadow-xs">
                <h2 className="font-heading text-xl text-preto border-b border-cinza-claro pb-3">3. OPÇÕES DE FRETE</h2>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-4 border border-cinza-claro rounded-lg cursor-pointer hover:bg-cinza-claro/20 transition-smooth">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'pac'}
                        onChange={() => setShippingMethod('pac')}
                        className="text-verde-medio focus:ring-verde-medio"
                      />
                      <div className="text-sm">
                        <span className="font-semibold block">Correios PAC</span>
                        <span className="text-xs text-cinza-escuro font-light">Prazo de 5 a 10 dias úteis</span>
                      </div>
                    </div>
                    <span className="font-heading text-md text-dourado">
                      {cartTotal >= 299 ? 'GRÁTIS' : 'R$ 15,00'}
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-4 border border-cinza-claro rounded-lg cursor-pointer hover:bg-cinza-claro/20 transition-smooth">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'sedex'}
                        onChange={() => setShippingMethod('sedex')}
                        className="text-verde-medio focus:ring-verde-medio"
                      />
                      <div className="text-sm">
                        <span className="font-semibold block">Correios SEDEX</span>
                        <span className="text-xs text-cinza-escuro font-light">Prazo de 1 a 3 dias úteis</span>
                      </div>
                    </div>
                    <span className="font-heading text-md text-dourado">
                      {cartTotal >= 299 ? 'GRÁTIS' : 'R$ 25,00'}
                    </span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Col: Order Summary */}
            <div className="space-y-6">
              <div className="bg-branco p-6 rounded-lg border border-cinza-claro shadow-xs space-y-6">
                <h2 className="font-heading text-xl text-preto border-b border-cinza-claro pb-3">RESUMO DO PEDIDO</h2>

                {/* Items preview */}
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.size}`} className="flex items-center space-x-3 text-xs">
                      <img src={item.image} alt={item.name} className="h-12 w-12 object-cover rounded bg-cinza-claro" />
                      <div className="flex-grow">
                        <h4 className="font-semibold text-preto line-clamp-1">{item.name}</h4>
                        <span className="text-cinza-escuro font-light">Qtd: {item.quantity} | Tamanho: {item.size}</span>
                      </div>
                      <span className="font-heading text-dourado text-sm">
                        R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Coupon Application */}
                <div className="space-y-2 border-t border-cinza-claro pt-4">
                  <label className="text-xs font-semibold text-cinza-escuro block">Cupom de Desconto</label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-verde-claro/20 border border-verde-medio/30 rounded p-2 text-xs">
                      <span className="font-semibold text-verde-escuro">✔ {appliedCoupon.code} aplicado</span>
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-vermelho-alerta font-semibold hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="CÓDIGO"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="bg-cinza-claro/50 border border-cinza-claro rounded px-3 py-1.5 text-xs flex-grow focus:outline-none focus:ring-1 focus:ring-verde-medio uppercase"
                        aria-label="Código do cupom"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        className="bg-verde-escuro hover:bg-verde-medio text-branco px-4 py-1.5 rounded text-xs font-semibold transition-smooth"
                      >
                        {couponLoading ? '...' : 'APLICAR'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[10px] text-vermelho-alerta font-medium">{couponError}</p>}
                </div>

                {/* Subtotals column */}
                <div className="border-t border-cinza-claro pt-4 space-y-2 text-xs font-light text-cinza-escuro">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto</span>
                    <span className="text-vermelho-alerta">- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>{shippingAmount === 0 ? 'Grátis' : `R$ ${shippingAmount.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-preto border-t border-cinza-claro pt-3">
                    <span className="font-heading tracking-wide">TOTAL</span>
                    <span className="font-heading text-lg text-dourado">
                      R$ {finalTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                {apiError && (
                  <div className="bg-vermelho-alerta/10 border border-vermelho-alerta/20 text-vermelho-alerta rounded p-3 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{apiError}</span>
                  </div>
                )}

                {checkoutError && (
                  <div className="bg-vermelho-alerta/10 border border-vermelho-alerta/20 text-vermelho-alerta rounded p-3 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-verde-escuro hover:bg-verde-medio text-branco py-4 rounded font-heading text-xl tracking-wider transition-smooth shadow-md flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <span>PROCESSANDO...</span>
                  ) : (
                    <>
                      <span>IR PARA PAGAMENTO</span>
                      <ShoppingBag className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
