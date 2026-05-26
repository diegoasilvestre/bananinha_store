import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Package,
  MapPin,
  LogOut,
  Shield,
  ChevronRight,
  Edit3,
  Save,
  X,
  Loader2,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSEO } from '../hooks/useSEO';

interface Order {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    size: string;
    quantity: number;
    unit_price: number;
  }>;
}

type AccountTab = 'profile' | 'orders' | 'addresses';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  paid: { label: 'Pago', color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  processing: { label: 'Preparando', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Package },
  shipped: { label: 'Enviado', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Truck },
  delivered: { label: 'Entregue', color: 'text-green-600 bg-green-600/10 border-green-600/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'text-vermelho-alerta bg-vermelho-alerta/10 border-vermelho-alerta/20', icon: X },
};

export function AccountPage() {
  useSEO({
    title: 'Minha Conta | Bananinha Store',
    description: 'Gerencie seus dados pessoais, visualize seus pedidos e acompanhe seus favoritos na Bananinha Store.'
  });

  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AccountTab>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Initialize edit fields
  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditPhone(profile.phone || '');
    }
  }, [profile]);

  // Fetch user's orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', profile?.email || user.email)
        .order('created_at', { ascending: false });

      if (orderErr) throw orderErr;

      // Fetch items for each order
      if (orderData && orderData.length > 0) {
        const orderIds = orderData.map((o: Order) => o.id);
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        const mapped = orderData.map((o: Order) => ({
          ...o,
          items: (itemsData || []).filter((i: { order_id: string }) => i.order_id === o.id),
        }));
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Reload the page to refresh profile from context
      window.location.reload();
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  const tabs: Array<{ key: AccountTab; label: string; icon: typeof User }> = [
    { key: 'profile', label: 'Meu Perfil', icon: User },
    { key: 'orders', label: 'Meus Pedidos', icon: Package },
    { key: 'addresses', label: 'Endereços', icon: MapPin },
  ];

  return (
    <div
      className="flex-grow relative min-h-[calc(100vh-var(--header-height))]"
      style={{
        backgroundImage: "url('/background-loja.jfif')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-preto/75 z-0" />

      <div className="relative z-10 wrapper-global py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-4">
            {/* User card */}
            <div className="bg-preto/70 backdrop-blur-md border border-dourado/20 rounded-xl p-6 text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-dourado to-dourado-claro flex items-center justify-center shadow-lg shadow-dourado/20">
                <span className="font-heading text-3xl text-preto">
                  {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-heading text-xl text-dourado tracking-wide">
                  {profile?.full_name || 'Usuário'}
                </h2>
                <p className="text-[11px] text-verde-claro/50 font-light">{user.email}</p>
                {memberSince && (
                  <p className="text-[10px] text-verde-claro/30 mt-1">Membro desde {memberSince}</p>
                )}
              </div>

              {profile?.is_admin && (
                <Link
                  to="/admin"
                  className="flex items-center justify-center space-x-2 bg-dourado/10 border border-dourado/30 text-dourado py-2 rounded-lg text-xs font-semibold hover:bg-dourado/20 transition-all"
                >
                  <Shield className="h-4 w-4" />
                  <span>PAINEL ADMIN</span>
                </Link>
              )}
            </div>

            {/* Navigation */}
            <nav className="bg-preto/70 backdrop-blur-md border border-dourado/20 rounded-xl overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center space-x-3 px-5 py-3.5 text-left text-sm font-medium transition-all border-b border-dourado/10 last:border-b-0 ${
                      isActive
                        ? 'bg-dourado/10 text-dourado border-l-2 border-l-dourado'
                        : 'text-verde-claro/60 hover:text-dourado hover:bg-dourado/5'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                    <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-5 py-3.5 text-left text-sm font-medium text-vermelho-alerta/70 hover:text-vermelho-alerta hover:bg-vermelho-alerta/5 transition-all"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span>Sair da Conta</span>
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-preto/70 backdrop-blur-md border border-dourado/20 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dourado/10">
                  <h2 className="font-heading text-2xl text-dourado tracking-wider">MEU PERFIL</h2>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex items-center space-x-1.5 text-dourado/70 hover:text-dourado text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>EDITAR</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="text-verde-claro/40 hover:text-verde-claro text-xs font-semibold transition-colors"
                      >
                        CANCELAR
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center space-x-1.5 bg-dourado text-preto px-4 py-1.5 rounded text-xs font-bold hover:bg-dourado-claro transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        <span>SALVAR</span>
                      </button>
                    </div>
                  )}
                </div>

                {saveSuccess && (
                  <div className="mx-6 mt-4 bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-xs flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Perfil atualizado com sucesso!</span>
                  </div>
                )}

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-dourado/70 tracking-wide block">NOME COMPLETO</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-preto/60 border border-dourado/20 rounded-lg px-4 py-2.5 text-sm text-branco focus:outline-none focus:ring-2 focus:ring-dourado/50 transition-all"
                        />
                      ) : (
                        <p className="text-sm text-verde-claro/80 bg-preto/40 border border-dourado/10 rounded-lg px-4 py-2.5">
                          {profile?.full_name || '—'}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-dourado/70 tracking-wide block">E-MAIL</label>
                      <p className="text-sm text-verde-claro/80 bg-preto/40 border border-dourado/10 rounded-lg px-4 py-2.5">
                        {user.email || '—'}
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-dourado/70 tracking-wide block">TELEFONE</label>
                      {editing ? (
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full bg-preto/60 border border-dourado/20 rounded-lg px-4 py-2.5 text-sm text-branco placeholder:text-verde-claro/30 focus:outline-none focus:ring-2 focus:ring-dourado/50 transition-all"
                        />
                      ) : (
                        <p className="text-sm text-verde-claro/80 bg-preto/40 border border-dourado/10 rounded-lg px-4 py-2.5">
                          {profile?.phone || 'Não informado'}
                        </p>
                      )}
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-dourado/70 tracking-wide block">TIPO DE CONTA</label>
                      <p className="text-sm text-verde-claro/80 bg-preto/40 border border-dourado/10 rounded-lg px-4 py-2.5 flex items-center space-x-2">
                        {profile?.is_admin ? (
                          <>
                            <Shield className="h-4 w-4 text-dourado" />
                            <span className="text-dourado font-semibold">Administrador</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-verde-claro/50" />
                            <span>Cliente</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-preto/70 backdrop-blur-md border border-dourado/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-dourado/10">
                  <h2 className="font-heading text-2xl text-dourado tracking-wider">MEUS PEDIDOS</h2>
                </div>

                {ordersLoading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="h-8 w-8 text-dourado animate-spin mx-auto mb-3" />
                    <p className="text-xs text-verde-claro/50">Carregando seus pedidos...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <ShoppingBag className="h-12 w-12 text-dourado/30 mx-auto" />
                    <div>
                      <p className="text-sm text-verde-claro/60 font-light">Você ainda não fez nenhum pedido.</p>
                      <p className="text-xs text-verde-claro/40 mt-1">Que tal dar uma olhada nos mantos disponíveis?</p>
                    </div>
                    <Link
                      to="/products"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-dourado to-dourado-claro text-preto px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider hover:shadow-lg hover:shadow-dourado/20 transition-all"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>VER CAMISETAS</span>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-dourado/10">
                    {orders.map((order) => {
                      const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending;
                      const StatusIcon = statusInfo.icon;
                      const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <div key={order.id} className="p-5 hover:bg-dourado/5 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                <span>{statusInfo.label}</span>
                              </div>
                              <span className="text-[10px] text-verde-claro/40 font-mono">
                                #{order.id.slice(0, 8)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-verde-claro/50">
                              <span>{orderDate}</span>
                              <span className="font-heading text-lg text-dourado">
                                R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Order items */}
                          {order.items && order.items.length > 0 && (
                            <div className="space-y-1.5 pl-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-verde-claro/60">
                                  <span>
                                    {item.product_name}{' '}
                                    <span className="text-dourado/60 font-mono">({item.size})</span>{' '}
                                    <span className="text-verde-claro/40">x{item.quantity}</span>
                                  </span>
                                  <span className="text-verde-claro/40">
                                    R$ {(item.unit_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-preto/70 backdrop-blur-md border border-dourado/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-dourado/10">
                  <h2 className="font-heading text-2xl text-dourado tracking-wider">MEUS ENDEREÇOS</h2>
                </div>
                <div className="py-20 text-center space-y-4">
                  <MapPin className="h-12 w-12 text-dourado/30 mx-auto" />
                  <div>
                    <p className="text-sm text-verde-claro/60 font-light">Nenhum endereço cadastrado.</p>
                    <p className="text-xs text-verde-claro/40 mt-1">
                      Seus endereços serão salvos automaticamente ao realizar sua primeira compra.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security notice */}
            <div className="flex items-start space-x-3 bg-preto/50 border border-dourado/10 rounded-lg p-4">
              <AlertCircle className="h-4 w-4 text-dourado/40 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-verde-claro/30 leading-relaxed">
                Seus dados estão protegidos com criptografia de ponta a ponta. Nunca compartilhamos suas informações pessoais com terceiros.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
