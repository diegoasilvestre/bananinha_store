import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ClipboardList, CheckCircle2, Truck, HelpCircle, Package, ArrowRight, Printer, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

interface OrderItemInfo {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

interface OrderInfo {
  id: string;
  customer_name: string;
  created_at: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  shipping_method: string;
  tracking_code?: string;
  address_street: string;
  address_number: string;
  address_neighborhood?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_complement?: string;
  items: OrderItemInfo[];
}

export function TrackPage() {
  useSEO({
    title: 'Rastrear Pedido | Bananinha Store',
    description: 'Consulte o status do seu pedido e rastreie seu envio em tempo real.'
  });

  const [orderIdInput, setOrderIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const cleanId = orderIdInput.trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);

      let query = supabase.from('orders').select('*');

      if (isUUID) {
        query = query.eq('id', cleanId);
      } else {
        // Partial search from recent 100 orders (fallback for shorter codes/admin simulation)
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        const matched = (recentOrders || []).find(
          (o) => o.id.toLowerCase().startsWith(cleanId.toLowerCase()) || 
                 o.id.toLowerCase().endsWith(cleanId.toLowerCase())
        );

        if (!matched) {
          throw new Error('Código do pedido inválido ou não encontrado.');
        }

        query = query.eq('id', matched.id);
      }

      const { data: orderData, error: orderErr } = await query.single();

      if (orderErr || !orderData) {
        throw new Error('Pedido não encontrado no banco de dados.');
      }

      // Fetch items
      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.id);

      if (itemsErr) throw itemsErr;

      setOrder({
        ...orderData,
        items: itemsData || []
      } as OrderInfo);

    } catch (err: any) {
      setError(err.message || 'Erro ao buscar dados do pedido.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: OrderInfo['status']) => {
    switch (status) {
      case 'pending': return 1;
      case 'paid':
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      default: return 0; // cancelled/refunded
    }
  };

  const statusStep = order ? getStatusStep(order.status) : 0;
  const isCancelled = order ? (order.status === 'cancelled' || order.status === 'refunded') : false;

  return (
    <div className="flex-grow bg-cinza-claro/50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Search Header */}
        <div className="bg-branco border border-cinza-claro rounded-lg p-6 sm:p-8 space-y-6 shadow-xs text-center">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl text-preto">RASTREAR MEU PEDIDO</h1>
            <p className="text-xs text-cinza-escuro font-light">Digite o ID completo ou parcial do seu pedido para consultar o status em tempo real.</p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              required
              placeholder="Ex: c7f3b198..."
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              className="bg-cinza-claro/70 border border-cinza-claro rounded px-4 py-2.5 text-xs flex-grow focus:outline-none focus:ring-1 focus:ring-verde-medio text-preto font-semibold"
              aria-label="Código do pedido"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-preto hover:bg-verde-medio text-branco border border-dourado px-6 py-2.5 rounded text-xs font-semibold tracking-wider flex items-center space-x-1.5 transition-smooth"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin text-dourado" /> : <Search className="h-4 w-4 text-dourado" />}
              <span>BUSCAR</span>
            </button>
          </form>

          {error && (
            <p className="text-xxs text-vermelho-alerta font-semibold flex items-center justify-center gap-1.5 bg-vermelho-alerta/5 p-2 rounded max-w-md mx-auto">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>

        {/* Tracking Invoice Panel */}
        {order && (
          <div className="space-y-8 animate-fade-in">
            {/* 1. Status Timeline Tracker */}
            <div className="bg-branco border border-cinza-claro rounded-lg p-6 sm:p-8 space-y-8 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-cinza-claro pb-4 gap-2">
                <div>
                  <h3 className="font-heading text-xl text-preto">STATUS DO ENVIO</h3>
                  <p className="text-xxs text-cinza-escuro font-light">Atualizado em tempo real pelas transportadoras integradas.</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xxs border border-cinza-escuro/20 hover:bg-cinza-claro px-3 py-1.5 rounded font-semibold flex items-center space-x-1 transition-smooth"
                >
                  <Printer className="h-3 w-3" />
                  <span>Imprimir Resumo</span>
                </button>
              </div>

              {isCancelled ? (
                <div className="bg-vermelho-alerta/10 border border-vermelho-alerta/20 text-vermelho-alerta rounded-lg p-5 flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">Pedido Cancelado ou Reembolsado</h4>
                    <p className="text-xxs font-light mt-0.5">Este pedido foi descontinuado ou cancelado pela central de atendimento da Bananinha Store.</p>
                  </div>
                </div>
              ) : (
                /* Timeline UI */
                <div className="grid grid-cols-4 relative pt-4">
                  {/* Background progress line */}
                  <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-cinza-claro z-0">
                    <div 
                      className="bg-verde-escuro h-full transition-all duration-500" 
                      style={{ width: `${statusStep === 4 ? 100 : statusStep === 3 ? 66.6 : statusStep === 2 ? 33.3 : 0}%` }}
                    ></div>
                  </div>

                  {/* Step 1: Pending */}
                  <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${statusStep >= 1 ? 'bg-verde-escuro text-branco' : 'bg-cinza-claro text-cinza-escuro'}`}>
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <span className="font-heading text-[10px] sm:text-xs uppercase tracking-wider block">Recebido</span>
                  </div>

                  {/* Step 2: Paid/Processing */}
                  <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${statusStep >= 2 ? 'bg-verde-escuro text-branco' : 'bg-cinza-claro text-cinza-escuro'}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="font-heading text-[10px] sm:text-xs uppercase tracking-wider block">Pago</span>
                  </div>

                  {/* Step 3: Shipped */}
                  <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${statusStep >= 3 ? 'bg-verde-escuro text-branco' : 'bg-cinza-claro text-cinza-escuro'}`}>
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="font-heading text-[10px] sm:text-xs uppercase tracking-wider block">Postado</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${statusStep >= 4 ? 'bg-verde-escuro text-branco' : 'bg-cinza-claro text-cinza-escuro'}`}>
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="font-heading text-[10px] sm:text-xs uppercase tracking-wider block">Entregue</span>
                  </div>
                </div>
              )}

              {/* Courier tracking info */}
              {order.status === 'shipped' && order.tracking_code && (
                <div className="bg-verde-claro/20 border border-verde-claro/50 rounded-lg p-5 space-y-2">
                  <h4 className="text-xs font-bold text-verde-escuro flex items-center gap-1.5 uppercase tracking-wider">
                    <Truck className="h-4 w-4" /> Pedido Postado e a Caminho!
                  </h4>
                  <p className="text-xxs text-cinza-escuro leading-relaxed">
                    Seu pacote foi entregue à transportadora e está sendo rastreado pelo código: <span className="font-mono font-bold text-preto">{order.tracking_code}</span>.
                  </p>
                  <a
                    href={`https://rastreamento.correios.com.br/app/index.php?objeto=${order.tracking_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xxs font-bold text-verde-escuro hover:text-verde-medio border-b border-verde-escuro"
                  >
                    <span>Rastrear nos Correios</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* 2. Order Information details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Items */}
              <div className="bg-branco border border-cinza-claro rounded-lg p-6 space-y-4 shadow-xs">
                <h4 className="font-heading text-lg text-preto border-b border-cinza-claro pb-2">ITENS COMPRADOS</h4>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xxs">
                      <div className="flex items-center space-x-2">
                        {item.image_url && <img src={item.image_url} alt={item.product_name} className="h-10 w-10 object-cover rounded bg-cinza-claro" />}
                        <div>
                          <h5 className="font-bold text-preto line-clamp-1">{item.product_name}</h5>
                          <span className="text-cinza-escuro font-light">Tamanho: {item.size} | Qtd: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-heading text-dourado text-xs font-semibold">
                        R$ {Number(item.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-cinza-claro pt-3 text-xxs space-y-1 text-cinza-escuro font-light">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R$ {Number(order.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-vermelho-alerta">
                      <span>Desconto</span>
                      <span>- R$ {Number(order.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>{order.shipping_amount === 0 ? 'Grátis' : `R$ ${Number(order.shipping_amount).toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-preto border-t border-cinza-claro pt-2">
                    <span className="font-heading tracking-wider">TOTAL PAGO</span>
                    <span className="font-heading text-dourado text-sm">
                      R$ {Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Address and Shipping Method */}
              <div className="bg-branco border border-cinza-claro rounded-lg p-6 space-y-4 shadow-xs text-xxs text-cinza-escuro font-light">
                <h4 className="font-heading text-lg text-preto border-b border-cinza-claro pb-2">DADOS DE ENVIO</h4>
                
                <div className="space-y-2">
                  <p><span className="font-semibold text-preto">Destinatário:</span> {order.customer_name}</p>
                  <p><span className="font-semibold text-preto">Método de Frete:</span> {order.shipping_method}</p>
                  <p><span className="font-semibold text-preto">Endereço de Entrega:</span></p>
                  <div className="bg-cinza-claro/30 rounded p-3 space-y-1 border border-cinza-claro/50 font-light">
                    <p>{order.address_street}, {order.address_number}</p>
                    {order.address_complement && <p>Compl: {order.address_complement}</p>}
                    {order.address_neighborhood && <p>Bairro: {order.address_neighborhood}</p>}
                    <p>{order.address_city} - {order.address_state}</p>
                    <p>CEP: {order.address_zip}</p>
                  </div>
                </div>

                <div className="bg-cinza-claro/30 border border-cinza-claro rounded-lg p-3 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-cinza-escuro/60 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-cinza-escuro leading-relaxed">
                    Dúvidas sobre a entrega? Fale com a central de suporte pelo WhatsApp clicando no link disponível na página de Sucesso ou diretamente pelo contato comercial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
