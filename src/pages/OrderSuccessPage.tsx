import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, ExternalLink, Printer, Clock } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useSEO } from '../hooks/useSEO';

interface OrderItemInfo {
  id: string;
  product_name: string;
  size: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

interface OrderDetail {
  id: string;
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
  payment_method: 'pix' | 'card';
  shipping_method: string;
  status: string;
  created_at: string;
  items: OrderItemInfo[];
}

export function OrderSuccessPage() {
  useSEO({
    title: 'Pedido Recebido | Bananinha Store',
    description: 'Parabéns, seu pedido na Bananinha Store foi processado. Acompanhe o status do pagamento aqui.'
  });

  const { orderId } = useParams<{ orderId: string }>();
  const { getOrderDetails, checkOrderStatus, loading, error } = useOrders();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');

  useEffect(() => {
    const loadOrder = async () => {
      if (orderId) {
        const details = await getOrderDetails(orderId);
        if (details) {
          setOrder(details as unknown as OrderDetail);
          setPaymentStatus(details.status);
        }
      }
    };
    loadOrder();
  }, [orderId, getOrderDetails]);

  // Polling for payment status
  useEffect(() => {
    if (!orderId || paymentStatus === 'paid') return;

    const interval = setInterval(async () => {
      const currentStatus = await checkOrderStatus(orderId);
      if (currentStatus) {
        setPaymentStatus(currentStatus);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, paymentStatus, checkOrderStatus]);

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="h-12 bg-cinza-claro rounded-full w-12 mx-auto"></div>
        <div className="h-8 bg-cinza-claro rounded w-1/3 mx-auto"></div>
        <div className="h-4 bg-cinza-claro rounded w-1/2 mx-auto"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl w-full mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-heading text-3xl text-preto">PEDIDO NÃO ENCONTRADO</h2>
        <p className="text-sm text-cinza-escuro font-light">
          Não conseguimos carregar os dados deste pedido no momento.
        </p>
        <Link to="/" className="bg-verde-escuro hover:bg-verde-medio text-branco px-8 py-3 rounded inline-block font-semibold tracking-wider transition-smooth">
          VOLTAR À LOJA
        </Link>
      </div>
    );
  }

  // Formatting strings
  const formattedDate = new Date(order.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const whatsappMessage = `Olá, gostaria de confirmar o meu pedido de ID: ${order.id}. Total: R$ ${order.total_amount.toFixed(2)}.`;
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex-grow bg-cinza-claro/50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Success Header */}
        <div className="bg-branco border border-cinza-claro rounded-lg p-8 text-center space-y-4 shadow-xs">
          {paymentStatus === 'paid' ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-verde-medio mx-auto animate-pulse-subtle" />
              <div className="space-y-1">
                <h1 className="font-heading text-3xl text-preto">PAGAMENTO CONFIRMADO!</h1>
                <p className="text-xs text-cinza-escuro font-light">Seu pedido foi recebido e o pagamento aprovado.</p>
                <p className="text-xs text-cinza-escuro font-light">Código do pedido: <span className="font-semibold text-verde-escuro">{order.id}</span></p>
                <p className="text-xxs text-cinza-escuro font-light">Data: {formattedDate}</p>
              </div>
            </>
          ) : (
            <>
              <Clock className="h-16 w-16 text-dourado mx-auto animate-pulse" />
              <div className="space-y-1">
                <h1 className="font-heading text-3xl text-preto">PEDIDO RECEBIDO</h1>
                <p className="text-sm font-semibold text-dourado">⏳ Aguardando confirmação de pagamento...</p>
                <p className="text-xs text-cinza-escuro font-light">Atualizaremos esta página automaticamente assim que a InfinitePay confirmar.</p>
                <p className="text-xs text-cinza-escuro font-light mt-2">Código do pedido: <span className="font-semibold text-verde-escuro">{order.id}</span></p>
              </div>
            </>
          )}

          <div className="flex justify-center gap-3 pt-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#1ebd59] text-branco px-6 py-3 rounded text-xs font-semibold tracking-wider flex items-center space-x-2 transition-smooth shadow-xs"
            >
              <MessageSquare className="h-4 w-4" />
              <span>ACOMPANHAR NO WHATSAPP</span>
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-cinza-escuro/20 hover:bg-cinza-claro/50 text-preto px-4 py-3 rounded text-xs font-semibold tracking-wider flex items-center space-x-2 transition-smooth"
            >
              <Printer className="h-4 w-4" />
              <span>IMPRIMIR</span>
            </button>
          </div>
        </div>

        {/* Order Details Invoice Card */}
        <div className="bg-branco border border-cinza-claro rounded-lg p-6 space-y-6 shadow-xs">
          <h2 className="font-heading text-xl text-preto border-b border-cinza-claro pb-3">DETALHES DO PEDIDO</h2>
          
          {/* Items Table */}
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-3">
                  {item.image_url && <img src={item.image_url} alt={item.product_name} className="h-12 w-12 object-cover rounded bg-cinza-claro" />}
                  <div>
                    <h4 className="font-semibold text-preto">{item.product_name}</h4>
                    <span className="text-cinza-escuro font-light">Tamanho: {item.size} | Qtd: {item.quantity}</span>
                  </div>
                </div>
                <span className="font-heading text-dourado text-sm">
                  R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing totals */}
          <div className="border-t border-cinza-claro pt-4 space-y-2 text-xs font-light text-cinza-escuro">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>R$ {order.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>Desconto</span>
                <span className="text-vermelho-alerta">- R$ {order.discount_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Frete ({order.shipping_method})</span>
              <span>{order.shipping_amount === 0 ? 'Grátis' : `R$ ${order.shipping_amount.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-preto border-t border-cinza-claro pt-3">
              <span className="font-heading tracking-wide text-sm">TOTAL PAGO</span>
              <span className="font-heading text-lg text-dourado">
                R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Address Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer */}
          <div className="bg-branco border border-cinza-claro rounded-lg p-6 space-y-3 shadow-xs text-xs font-light">
            <h3 className="font-heading text-md text-preto border-b border-cinza-claro pb-2">CLIENTE</h3>
            <p><span className="font-semibold text-preto">Nome:</span> {order.customer_name}</p>
            <p><span className="font-semibold text-preto">E-mail:</span> {order.customer_email}</p>
            {order.customer_phone && <p><span className="font-semibold text-preto">Telefone:</span> {order.customer_phone}</p>}
            {order.customer_cpf && <p><span className="font-semibold text-preto">CPF:</span> {order.customer_cpf}</p>}
            <p><span className="font-semibold text-preto">Pagamento:</span> {order.payment_method === 'pix' ? 'Pix' : 'Cartão de Crédito'}</p>
          </div>

          {/* Address */}
          <div className="bg-branco border border-cinza-claro rounded-lg p-6 space-y-3 shadow-xs text-xs font-light">
            <h3 className="font-heading text-md text-preto border-b border-cinza-claro pb-2">ENTREGA</h3>
            <p><span className="font-semibold text-preto">Rua:</span> {order.address_street}, {order.address_number}</p>
            {order.address_complement && <p><span className="font-semibold text-preto">Complemento:</span> {order.address_complement}</p>}
            {order.address_neighborhood && <p><span className="font-semibold text-preto">Bairro:</span> {order.address_neighborhood}</p>}
            <p><span className="font-semibold text-preto">Cidade/UF:</span> {order.address_city} - {order.address_state}</p>
            <p><span className="font-semibold text-preto">CEP:</span> {order.address_zip}</p>
          </div>
        </div>

        {/* Redirect buttons */}
        <div className="text-center">
          <Link
            to="/products"
            className="text-verde-escuro hover:text-verde-medio text-xs font-semibold tracking-wider uppercase inline-flex items-center space-x-1"
          >
            <span>Continuar Comprando</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
