import { useEffect, useState, useCallback } from 'react';
import { 
  ShoppingBag, 
  Settings, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare, 
  RefreshCw, 
  ShieldAlert, 
  Check,
  FolderTree
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { triggerWhatsAppNotification } from '../lib/whatsapp';
import { ProductModal } from '../components/admin/ProductModal';
import type { Product, Category } from '../hooks/useProducts';

interface OrderItem {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_cpf?: string;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  shipping_method: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  created_at: string;
  items?: OrderItem[];
}

interface StoreSetting {
  key: string;
  value: string;
  description?: string;
}

const SETTING_LABELS: Record<string, { label: string; description: string; group: string }> = {
  store_name: {
    label: 'Nome da Loja',
    description: 'Nome que aparece no cabeçalho e na logomarca da loja.',
    group: 'Identidade e Branding',
  },
  store_tagline: {
    label: 'Slogan da Loja',
    description: 'Texto complementar de slogan que aparece nos mecanismos de busca (SEO).',
    group: 'Identidade e Branding',
  },
  hero_title: {
    label: 'Título do Banner Principal (Hero)',
    description: 'Título principal que aparece em destaque no banner da página inicial.',
    group: 'Identidade e Branding',
  },
  hero_subtitle: {
    label: 'Subtítulo do Banner Principal (Hero)',
    description: 'Descrição de texto menor abaixo do título no banner da home.',
    group: 'Identidade e Branding',
  },
  announcement_bar: {
    label: 'Barra de Aviso (Topo da Página)',
    description: 'Texto de aviso no topo (Ex: Frete Grátis acima de R$ 299!). Deixe em branco para ocultar.',
    group: 'Identidade e Branding',
  },
  whatsapp_number: {
    label: 'WhatsApp de Suporte / Contato',
    description: 'Número com DDI para onde as mensagens e dúvidas dos clientes serão direcionadas (Ex: 5511999999999).',
    group: 'Contato e Redes Sociais',
  },
  instagram_url: {
    label: 'Instagram da Loja',
    description: 'Link completo da conta do Instagram (Ex: https://instagram.com/sualoja).',
    group: 'Contato e Redes Sociais',
  },
  size_guide_url: {
    label: 'Guia de Tamanhos (Link da Imagem)',
    description: 'Link da imagem com as dimensões de cada tamanho para exibir aos clientes.',
    group: 'Contato e Redes Sociais',
  },
  free_shipping_min: {
    label: 'Valor Mínimo para Frete Grátis (R$)',
    description: 'O valor mínimo de compras necessário para ativar o frete gratuito para o cliente.',
    group: 'Regras de Vendas',
  },
  quiz_enabled: {
    label: 'Quiz do Torcedor Ativo',
    description: 'Define se o questionário "Qual camiseta combina com você" ficará disponível.',
    group: 'Regras de Vendas',
  },
};

export function AdminPage() {
  const { profile } = useAuth();
  const { refreshSettings } = useSettings();
  const [isAdminBypassed, setIsAdminBypassed] = useState(false);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'orders' | 'settings' | 'alerts'>('products');

  // Products Tab States
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Orders Tab States
  const [orders, setOrders] = useState<Order[]>([]);

  // Settings Tab States
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsList, setSettingsList] = useState<StoreSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Alertas Tab States
  interface PriceAlert {
    id: string;
    email: string;
    product_id: string;
    size?: string;
    alert_type: string;
    notified: boolean;
    created_at: string;
    product?: Product;
  }
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertActionLoading, setAlertActionLoading] = useState<string | null>(null);

  // Loading indicator
  const [loading, setLoading] = useState(false);

  // Categories Tab States
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'club' | 'league' | 'national'>('club');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [newCatLeagueName, setNewCatLeagueName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Check if authenticated user is admin
  const hasAdminAccess = profile?.is_admin || isAdminBypassed;

  // 1. Fetch Products and Variations
  const fetchProductsData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch products and their category
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, category:categories(*)');

      if (prodErr) throw prodErr;

      // Fetch all variations to sum stocks
      const { data: varData, error: varErr } = await supabase
        .from('product_variations')
        .select('*');

      if (varErr) throw varErr;

      const mappedProducts = (prodData || []).map((p: Product) => {
        const prodVars = (varData || []).filter((v: { product_id: string }) => v.product_id === p.id);
        return {
          ...p,
          variations: prodVars
        };
      });

      setProducts(mappedProducts);
    } catch (err) {
      console.error('Erro ao buscar produtos admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Orders & Order Items
  const fetchOrdersData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderErr) throw orderErr;

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*');

      if (itemsErr) throw itemsErr;

      const mappedOrders = (orderData || []).map((o: Order) => {
        const orderItems = (itemsData || []).filter((i: { order_id: string }) => i.order_id === o.id);
        return {
          ...o,
          items: orderItems
        };
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Erro ao buscar pedidos admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch Settings
  const fetchSettingsData = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('store_settings')
        .select('*');

      if (err) throw err;

      if (data) {
        setSettingsList(data as StoreSetting[]);
        const dict: Record<string, string> = {};
        data.forEach((s: { key: string; value: string }) => {
          dict[s.key] = s.value;
        });
        setSettings(dict);
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // 4. Fetch Alerts
  const fetchAlertsData = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const { data: alertData, error: alertErr } = await supabase
        .from('price_alerts')
        .select('*, product:products(*)')
        .order('created_at', { ascending: false });

      if (alertErr) throw alertErr;
      setAlerts((alertData as any) || []);
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const handleTriggerNotify = async (productId: string, size?: string) => {
    setAlertActionLoading(`${productId}-${size || 'all'}`);
    try {
      const response = await fetch('/api/alerts/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          size
        })
      });

      if (!response.ok) throw new Error('Falha ao acionar notificação');
      
      alert('E-mails de notificação de estoque enviados com sucesso!');
      fetchAlertsData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setAlertActionLoading(null);
    }
  };

  const fetchCategoriesData = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (err) throw err;
      setAdminCategories((data || []) as Category[]);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load initial tab data
  useEffect(() => {
    if (!hasAdminAccess) return;

    if (activeTab === 'products') {
      fetchProductsData();
    } else if (activeTab === 'categories') {
      fetchCategoriesData();
    } else if (activeTab === 'orders') {
      fetchOrdersData();
    } else if (activeTab === 'settings') {
      fetchSettingsData();
    } else if (activeTab === 'alerts') {
      fetchAlertsData();
    }
  }, [activeTab, hasAdminAccess, fetchProductsData, fetchCategoriesData, fetchOrdersData, fetchSettingsData, fetchAlertsData]);

  // Realtime subscription for Orders
  useEffect(() => {
    if (!hasAdminAccess || activeTab !== 'orders') return;

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Refresh list automatically
          fetchOrdersData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeTab, hasAdminAccess, fetchOrdersData]);

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta camiseta?')) return;

    try {
      const { error: err } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (err) throw err;
      fetchProductsData();
    } catch (err) {
      alert('Erro ao excluir produto. Verifique se existem pedidos associados a ele.');
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      // 1. Fetch current order details to get the old status and customer details
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      const { error: err } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (err) throw err;

      // 2. Trigger notification
      if (currentOrder && currentOrder.status !== newStatus) {
        triggerWhatsAppNotification('order_status_updated', {
          order: {
            ...currentOrder,
            status: newStatus
          },
          oldStatus: currentOrder.status,
          newStatus
        });
      }

      fetchOrdersData();
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
    }
  };

  const handleSettingsChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);

    try {
      const promises = Object.entries(settings).map(async ([key, value]) => {
        const { error } = await supabase
          .from('store_settings')
          .update({ value, updated_at: new Date() })
          .eq('key', key);
        if (error) throw error;
      });

      await Promise.all(promises);
      await refreshSettings();
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
      fetchSettingsData();
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      alert(`Erro ao salvar configurações: ${err.message || 'Verifique suas permissões de RLS no Supabase.'}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  const calculateStock = (prod: Product) => {
    if (!prod.variations) return 0;
    return prod.variations.reduce((acc, v) => acc + v.stock, 0);
  };

  // Render Access Denied state if not admin
  if (!hasAdminAccess) {
    return (
      <div className="flex-grow max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <ShieldAlert className="h-14 w-14 text-vermelho-alerta mx-auto animate-pulse-subtle" />
        <div className="space-y-2">
          <h1 className="font-heading text-3xl text-preto">ACESSO RESTRITO</h1>
          <p className="text-sm text-cinza-escuro font-light leading-relaxed">
            Esta área é exclusiva para administradores da Bananinha Store. Faça login com uma conta administrativa.
          </p>
        </div>

        <div className="bg-branco border border-cinza-claro rounded-lg p-5 shadow-xs space-y-4">
          <p className="text-xxs text-cinza-escuro">Apenas para testes locais e validação de fluxo:</p>
          <button
            type="button"
            onClick={() => setIsAdminBypassed(true)}
            className="w-full bg-preto border border-dourado hover:bg-verde-medio text-branco py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth"
          >
            SIMULAR ACESSO ADMIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-grow w-full relative min-h-screen bg-preto"
      style={{ 
        backgroundImage: "url('/background-loja.jfif')", 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay for Admin Page table contrast */}
      <div className="absolute inset-0 bg-preto/80 z-0"></div>

      <div className="relative z-10 wrapper-global py-10 space-y-8">
        {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-cinza-claro pb-5 gap-4">
        <div>
          <h1 className="font-heading text-4xl text-preto">PAINEL ADMINISTRATIVO</h1>
          <p className="text-xs text-cinza-escuro font-light">Gerenciamento geral da Bananinha Store em tempo real.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-cinza-claro border border-cinza-claro/50 rounded-lg p-1 space-x-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md font-semibold transition-smooth flex items-center space-x-1.5 ${activeTab === 'products' ? 'bg-preto text-branco border-dourado shadow-xs' : 'text-cinza-escuro hover:text-preto'}`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Produtos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-md font-semibold transition-smooth flex items-center space-x-1.5 ${activeTab === 'categories' ? 'bg-preto text-branco border-dourado shadow-xs' : 'text-cinza-escuro hover:text-preto'}`}
          >
            <FolderTree className="h-4 w-4" />
            <span>Categorias</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-md font-semibold transition-smooth flex items-center space-x-1.5 ${activeTab === 'orders' ? 'bg-preto text-branco border-dourado shadow-xs' : 'text-cinza-escuro hover:text-preto'}`}
          >
            <FileText className="h-4 w-4" />
            <span>Pedidos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md font-semibold transition-smooth flex items-center space-x-1.5 ${activeTab === 'settings' ? 'bg-preto text-branco border-dourado shadow-xs' : 'text-cinza-escuro hover:text-preto'}`}
          >
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-md font-semibold transition-smooth flex items-center space-x-1.5 ${activeTab === 'alerts' ? 'bg-preto text-branco border-dourado shadow-xs' : 'text-cinza-escuro hover:text-preto'}`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Alertas</span>
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="bg-branco border border-cinza-claro rounded-lg shadow-xs overflow-hidden">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-2xl tracking-wide text-preto">TODOS OS PRODUTOS</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setProductModalOpen(true);
                }}
                className="bg-preto hover:bg-verde-medio text-branco px-5 py-2.5 rounded text-xs font-semibold tracking-wider flex items-center space-x-1.5 transition-smooth border border-dourado shadow-xs"
              >
                <Plus className="h-4 w-4 text-dourado" />
                <span>CADASTRAR CAMISETA</span>
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center animate-pulse text-xs text-cinza-escuro">Carregando lista de produtos...</div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-xs text-cinza-escuro font-light">Nenhum produto cadastrado no banco de dados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-cinza-claro border-b border-cinza-claro/50 font-bold uppercase text-cinza-escuro tracking-wider">
                      <th className="p-4">Imagem</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Nome</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4 text-right">Preço</th>
                      <th className="p-4 text-center">Estoque</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cinza-claro">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-cinza-claro/10 transition-smooth">
                        <td className="p-4">
                          <img src={prod.main_image || ''} alt={prod.name} className="h-10 w-10 object-cover rounded bg-cinza-claro border" />
                        </td>
                        <td className="p-4 font-mono font-semibold">{prod.sku}</td>
                        <td className="p-4 font-medium text-preto">{prod.name}</td>
                        <td className="p-4">{prod.category?.name || 'Clube Geral'}</td>
                        <td className="p-4 text-right font-semibold text-dourado">
                          R$ {prod.regular_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center font-bold">{calculateStock(prod)} un</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prod.active ? 'bg-verde-claro/30 text-verde-escuro' : 'bg-vermelho-alerta/10 text-vermelho-alerta'}`}>
                            {prod.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod);
                                setProductModalOpen(true);
                              }}
                              className="p-1.5 text-cinza-escuro hover:text-dourado transition-smooth hover:bg-cinza-claro rounded"
                              aria-label="Editar produto"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 text-cinza-escuro hover:text-vermelho-alerta transition-smooth hover:bg-cinza-claro rounded"
                              aria-label="Excluir produto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-2xl tracking-wide text-preto">PEDIDOS DA LOJA</h2>
              <button
                type="button"
                onClick={fetchOrdersData}
                className="text-cinza-escuro hover:text-preto text-xs font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>ATUALIZAR</span>
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center animate-pulse text-xs text-cinza-escuro">Carregando lista de pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center text-xs text-cinza-escuro font-light">Nenhum pedido efetuado até o momento.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-cinza-claro border-b border-cinza-claro/50 font-bold uppercase text-cinza-escuro tracking-wider">
                      <th className="p-4">Pedido ID</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Itens</th>
                      <th className="p-4 text-right">Total</th>
                      <th className="p-4 text-center">Pagamento</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Rastreamento / WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cinza-claro">
                    {orders.map((ord) => {
                      const whatsappText = `Olá ${ord.customer_name}, o status do seu pedido de ID ${ord.id} foi atualizado para: ${ord.status}.`;
                      const whatsappUrl = `https://wa.me/${ord.customer_phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(whatsappText)}`;
                      return (
                        <tr key={ord.id} className="hover:bg-cinza-claro/10 transition-smooth">
                          <td className="p-4 font-mono text-[10px] max-w-[120px] truncate" title={ord.id}>
                            {ord.id}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-preto block">{ord.customer_name}</span>
                            <span className="text-[10px] text-cinza-escuro">{ord.customer_email}</span>
                          </td>
                          <td className="p-4 font-light text-xxs">
                            {ord.items?.map((item, idx) => (
                              <div key={idx}>
                                {item.product_name} ({item.size}) x{item.quantity}
                              </div>
                            ))}
                          </td>
                          <td className="p-4 text-right font-bold text-dourado">
                            R$ {ord.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-center uppercase font-medium">{ord.payment_method}</td>
                          <td className="p-4 text-center">
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as Order['status'])}
                              className={`border border-cinza-claro rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-dourado ${
                                ord.status === 'paid' ? 'bg-verde-claro/20 text-verde-escuro border-verde-medio/20' : 
                                ord.status === 'cancelled' ? 'bg-vermelho-alerta/10 text-vermelho-alerta border-vermelho-alerta/20' : 
                                'bg-branco text-preto'
                              }`}
                            >
                              <option value="pending">Pendente</option>
                              <option value="paid">Pago</option>
                              <option value="processing">Preparando</option>
                              <option value="shipped">Enviado</option>
                              <option value="delivered">Entregue</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              {ord.customer_phone && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded transition-smooth flex items-center space-x-1"
                                  title="Notificar no WhatsApp"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="p-6 space-y-6 text-preto">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-2xl tracking-wide text-preto">TODAS AS CATEGORIAS</h2>
              <button
                type="button"
                onClick={fetchCategoriesData}
                className="text-cinza-escuro hover:text-preto text-xs font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>ATUALIZAR</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form to create Category */}
              <div className="bg-cinza-claro/20 border border-cinza-claro rounded-lg p-5 space-y-4">
                <h3 className="font-heading text-lg text-preto uppercase tracking-wide">CRIAR NOVA CATEGORIA</h3>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-preto block uppercase">Nome da Categoria *</label>
                    <input
                      type="text"
                      placeholder="EX: Barcelona, Premier League"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio bg-branco text-preto font-medium placeholder-cinza-escuro/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-preto block uppercase">Tipo *</label>
                    <select
                      value={newCatType}
                      onChange={(e) => {
                        setNewCatType(e.target.value as any);
                        setNewCatParentId('');
                        setNewCatLeagueName('');
                      }}
                      className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio bg-branco text-preto font-medium"
                    >
                      <option value="club">Clube (Time)</option>
                      <option value="league">Liga / Campeonato</option>
                      <option value="national">Seleção / País</option>
                    </select>
                  </div>

                  {newCatType === 'club' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-preto block uppercase">Liga / Campeonato</label>
                      <select
                        value={newCatParentId}
                        onChange={(e) => setNewCatParentId(e.target.value)}
                        className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio bg-branco text-preto font-medium"
                      >
                        <option value="">Sem Liga (Avulso)</option>
                        {adminCategories.filter(c => c.type === 'league').map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                        <option value="_new_" className="text-verde-medio font-bold">+ Criar Nova Liga...</option>
                      </select>
                    </div>
                  )}

                  {newCatType === 'club' && newCatParentId === '_new_' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-preto block uppercase">Nome da Nova Liga *</label>
                      <input
                        type="text"
                        placeholder="EX: La Liga, Champions League"
                        value={newCatLeagueName}
                        onChange={(e) => setNewCatLeagueName(e.target.value)}
                        className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio bg-branco text-preto font-medium placeholder-cinza-escuro/50"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={creatingCat || !newCatName.trim()}
                    onClick={async () => {
                      setCreatingCat(true);
                      try {
                        let finalParentId = newCatParentId || null;

                        // Create new league first
                        if (newCatType === 'club' && newCatParentId === '_new_') {
                          if (!newCatLeagueName.trim()) {
                            alert('Por favor, digite o nome da nova liga.');
                            setCreatingCat(false);
                            return;
                          }
                          const leagueSlug = newCatLeagueName.trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9\s-]/g, '')
                            .replace(/\s+/g, '-');

                          const { data: newLeague, error: leagueErr } = await supabase
                            .from('categories')
                            .insert({
                              name: newCatLeagueName.trim(),
                              slug: leagueSlug,
                              type: 'league',
                              active: true,
                              sort_order: adminCategories.length + 1,
                            })
                            .select()
                            .single();

                          if (leagueErr) throw leagueErr;
                          if (newLeague) {
                            adminCategories.push(newLeague as Category);
                            finalParentId = (newLeague as Category).id;
                          }
                        }

                        const slug = newCatName.trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9\s-]/g, '')
                          .replace(/\s+/g, '-');

                        const { data: newCat, error: catErr } = await supabase
                          .from('categories')
                          .insert({
                            name: newCatName.trim(),
                            slug,
                            type: newCatType,
                            parent_id: newCatType === 'club' ? finalParentId : null,
                            active: true,
                            sort_order: adminCategories.length + 1,
                          })
                          .select()
                          .single();

                        if (catErr) throw catErr;
                        if (newCat) {
                          setAdminCategories([...adminCategories, newCat as Category]);
                          setNewCatName('');
                          setNewCatParentId('');
                          setNewCatLeagueName('');
                          alert('Categoria criada com sucesso!');
                        }
                      } catch (err: any) {
                        console.error('Erro ao criar categoria:', err);
                        alert(`Erro ao criar categoria: ${err.message || 'Verifique se não é duplicada.'}`);
                      } finally {
                        setCreatingCat(false);
                      }
                    }}
                    className="w-full bg-preto hover:bg-verde-medio text-branco py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth border border-dourado disabled:opacity-50"
                  >
                    {creatingCat ? 'CRIANDO...' : 'CRIAR CATEGORIA'}
                  </button>
                </div>
              </div>

              {/* Table of categories */}
              <div className="lg:col-span-2">
                {categoriesLoading ? (
                  <div className="py-20 text-center animate-pulse text-xs text-cinza-escuro">Carregando categorias...</div>
                ) : adminCategories.length === 0 ? (
                  <div className="py-20 text-center text-xs text-cinza-escuro font-light">Nenhuma categoria cadastrada.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-cinza-claro border-b border-cinza-claro/50 font-bold uppercase text-cinza-escuro tracking-wider">
                          <th className="p-4">Nome</th>
                          <th className="p-4">Tipo</th>
                          <th className="p-4">Liga Relacionada</th>
                          <th className="p-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cinza-claro">
                        {adminCategories.map((cat) => {
                          const typeLabel = 
                            cat.type === 'club' ? 'Clube' : 
                            cat.type === 'league' ? 'Liga' : 'Seleção';
                          const parentName = cat.parent_id 
                            ? adminCategories.find(c => c.id === cat.parent_id)?.name || 'Desconhecida'
                            : '—';

                          return (
                            <tr key={cat.id} className="hover:bg-cinza-claro/10 transition-smooth">
                              <td className="p-4 font-semibold text-preto">{cat.name}</td>
                              <td className="p-4 font-mono font-medium text-cinza-escuro">{typeLabel}</td>
                              <td className="p-4 text-cinza-escuro font-medium">{parentName}</td>
                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) return;
                                    try {
                                      const { error: err } = await supabase
                                        .from('categories')
                                        .delete()
                                        .eq('id', cat.id);

                                      if (err) throw err;
                                      setAdminCategories(adminCategories.filter(c => c.id !== cat.id));
                                      alert('Categoria excluída com sucesso!');
                                    } catch (err: any) {
                                      console.error('Erro ao excluir categoria:', err);
                                      alert(`Erro ao excluir categoria: ${err.message || 'Verifique se existem produtos vinculados.'}`);
                                    }
                                  }}
                                  className="p-1.5 text-cinza-escuro hover:text-vermelho-alerta hover:bg-cinza-claro rounded transition-smooth"
                                  title="Excluir categoria"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-8">
            <div className="border-b border-cinza-claro pb-3 flex justify-between items-center">
              <h2 className="font-heading text-2xl tracking-wide text-preto">CONFIGURAÇÕES DA LOJA</h2>
              {settingsSuccess && (
                <div className="bg-verde-claro/20 border border-verde-medio/20 text-verde-escuro px-4 py-1.5 rounded text-xs flex items-center space-x-1">
                  <Check className="h-4 w-4" />
                  <span>Configurações salvas com sucesso!</span>
                </div>
              )}
            </div>

            {settingsLoading && Object.keys(settings).length === 0 ? (
              <div className="py-20 text-center animate-pulse text-xs text-cinza-escuro">Carregando configurações...</div>
            ) : (
              <div className="space-y-8">
                {['Identidade e Branding', 'Contato e Redes Sociais', 'Regras de Vendas'].map((groupName) => {
                  const groupItems = settingsList.filter(s => SETTING_LABELS[s.key]?.group === groupName);
                  if (groupItems.length === 0) return null;
                  
                  return (
                    <div key={groupName} className="bg-cinza-claro/25 border border-cinza-claro/50 rounded-lg p-5 space-y-4">
                      <h3 className="font-heading text-lg text-verde-escuro border-b border-cinza-claro/50 pb-2 uppercase tracking-wider">{groupName}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groupItems.map((set) => {
                          const info = SETTING_LABELS[set.key] || { label: set.key.replace(/_/g, ' '), description: set.description };
                          return (
                            <div key={set.key} className="space-y-1">
                              <label className="text-xs font-bold text-preto block uppercase tracking-wide">
                                {info.label}
                              </label>
                              
                              {set.key === 'quiz_enabled' ? (
                                <select
                                  value={settings[set.key] || 'true'}
                                  onChange={(e) => handleSettingsChange(set.key, e.target.value)}
                                  className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio bg-branco text-preto font-medium"
                                  aria-label={info.label}
                                >
                                  <option value="true">Ativado (Sim)</option>
                                  <option value="false">Desativado (Não)</option>
                                </select>
                              ) : (
                                <input
                                  type={set.key === 'free_shipping_min' ? 'number' : 'text'}
                                  value={settings[set.key] || ''}
                                  onChange={(e) => handleSettingsChange(set.key, e.target.value)}
                                  className="w-full border border-cinza-claro rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-verde-medio bg-branco text-preto font-medium"
                                  aria-label={info.label}
                                />
                              )}
                              
                              {info.description && (
                                <p className="text-[10px] text-cinza-escuro font-light leading-relaxed">{info.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-cinza-claro pt-4 flex justify-end">
              <button
                type="submit"
                disabled={settingsLoading}
                className="bg-preto hover:bg-verde-medio text-branco px-8 py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth border border-dourado shadow-md cursor-pointer"
              >
                {settingsLoading ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
              </button>
            </div>
          </form>
        )}

        {/* Alertas Tab */}
        {activeTab === 'alerts' && (
          <div className="p-6 space-y-6">
            <h2 className="font-heading text-2xl tracking-wide text-preto border-b border-cinza-claro pb-3">FILA DE ALERTAS DE ESTOQUE</h2>

            {alertsLoading ? (
              <div className="py-20 text-center animate-pulse text-xs text-cinza-escuro">Carregando fila de alertas...</div>
            ) : alerts.length === 0 ? (
              <div className="py-20 text-center text-xs text-cinza-escuro font-light">Nenhuma solicitação de alerta de volta ao estoque no momento.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-cinza-claro border-b border-cinza-claro/50 font-bold uppercase text-cinza-escuro tracking-wider">
                      <th className="p-4">Produto</th>
                      <th className="p-4 text-center">Tamanho</th>
                      <th className="p-4">E-mail do Cliente</th>
                      <th className="p-4 text-center">Data Registro</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cinza-claro">
                    {alerts.map((al) => {
                      const date = new Date(al.created_at).toLocaleDateString('pt-BR');
                      const sizeLabel = al.size || 'Qualquer';
                      const isLoadingAction = alertActionLoading === `${al.product_id}-${al.size || 'all'}`;

                      return (
                        <tr key={al.id} className="hover:bg-cinza-claro/10 transition-smooth">
                          <td className="p-4 font-semibold text-preto">{al.product?.name || 'Produto Desconhecido'}</td>
                          <td className="p-4 text-center font-mono font-bold">{sizeLabel}</td>
                          <td className="p-4 font-medium text-cinza-escuro">{al.email}</td>
                          <td className="p-4 text-center">{date}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${al.notified ? 'bg-verde-claro/30 text-verde-escuro' : 'bg-vermelho-alerta/10 text-vermelho-alerta'}`}>
                              {al.notified ? 'Notificado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {!al.notified ? (
                              <button
                                type="button"
                                disabled={isLoadingAction}
                                onClick={() => handleTriggerNotify(al.product_id, al.size)}
                                className="bg-preto hover:bg-verde-medio text-branco px-3 py-1.5 rounded text-[10px] font-bold tracking-wide uppercase transition-smooth border border-dourado disabled:opacity-50"
                              >
                                {isLoadingAction ? 'Enviando...' : 'Notificar Estoque'}
                              </button>
                            ) : (
                              <span className="text-xxs text-cinza-escuro/60 font-light flex items-center justify-center gap-1">
                                <Check className="h-3 w-3 text-verde-medio" /> Enviado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for product edit/create */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setProductModalOpen(false)}
        productToEdit={selectedProduct}
        onSave={() => {
          fetchProductsData();
        }}
      />
      </div>
    </div>
  );
}
