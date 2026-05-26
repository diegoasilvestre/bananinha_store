import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Truck, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import type { Product, ProductVariation } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/product/ProductCard';
import { supabase } from '../lib/supabase';
import { triggerWhatsAppNotification } from '../lib/whatsapp';
import { useSEO } from '../hooks/useSEO';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getProductBySlug, getRelatedProducts, loading, error } = useProducts();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  
  useSEO({
    title: product ? `${product.name}${product.season ? ` - Temporada ${product.season}` : ''}` : 'Carregando Manto...',
    description: product ? (product.short_desc || product.description || '').substring(0, 160) : 'Carregando detalhes do manto de futebol...',
    image: product?.main_image || undefined
  });
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Customization states
  const [isCustomized, setIsCustomized] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');

  const handleNameChange = (val: string) => {
    if (val.length <= 12 && /^[a-zA-Z\s]*$/.test(val)) {
      setCustomName(val.toUpperCase());
    }
  };

  const handleNumberChange = (val: string) => {
    if (val.length <= 2 && /^\d*$/.test(val)) {
      setCustomNumber(val);
    }
  };

  const isCustomizationValid = !isCustomized || (customName.trim().length > 0 && customNumber.trim().length > 0);

  // Sprint 6: Pre-order & Look states
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedLookItems, setSelectedLookItems] = useState<Record<string, boolean>>({});
  const [lookAddedSuccess, setLookAddedSuccess] = useState(false);

  // Shipping Calculator state
  const [cep, setCep] = useState('');
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingResults, setShippingResults] = useState<{
    pac: { price: number; days: number };
    sedex: { price: number; days: number };
    city: string;
    state: string;
  } | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const handleCepChange = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 8) {
      let formatted = clean;
      if (clean.length > 5) {
        formatted = `${clean.slice(0, 5)}-${clean.slice(5)}`;
      }
      setCep(formatted);
    }
  };

  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setShippingError('Digite um CEP válido com 8 dígitos.');
      return;
    }

    setCalculatingShipping(true);
    setShippingError(null);
    setShippingResults(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setShippingError('CEP não encontrado.');
        return;
      }

      const uf = data.uf ? data.uf.toUpperCase() : 'SP';
      const city = data.localidade || '';

      // Base pricing calculation by region
      let pacPrice = 15.90;
      let pacDays = 5;
      let sedexPrice = 24.90;
      let sedexDays = 2;

      const regionNorte = ['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'];
      const regionNordeste = ['BA', 'PE', 'CE', 'RN', 'PB', 'MA', 'PI', 'AL', 'SE'];
      const regionSul = ['PR', 'SC', 'RS'];
      const regionCentroOeste = ['DF', 'GO', 'MT', 'MS'];

      if (regionNorte.includes(uf)) {
        pacPrice = 29.90;
        pacDays = 10;
        sedexPrice = 49.90;
        sedexDays = 4;
      } else if (regionNordeste.includes(uf)) {
        pacPrice = 24.90;
        pacDays = 8;
        sedexPrice = 39.90;
        sedexDays = 3;
      } else if (regionSul.includes(uf) || regionCentroOeste.includes(uf)) {
        pacPrice = 19.90;
        pacDays = 6;
        sedexPrice = 29.90;
        sedexDays = 3;
      }

      // Free shipping rules (free shipping over R$ 299)
      const isFreeShipping = displayPrice >= 299;
      if (isFreeShipping) {
        pacPrice = 0;
      }

      setShippingResults({
        pac: { price: pacPrice, days: pacDays },
        sedex: { price: sedexPrice, days: sedexDays },
        city,
        state: uf
      });
    } catch (err) {
      console.error(err);
      setShippingError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setCalculatingShipping(false);
    }
  };

  useEffect(() => {
    const loadProductData = async () => {
      if (!slug) return;
      const data = await getProductBySlug(slug);
      if (data) {
        setProduct(data);
        // Default select first available variation
        const firstAvailable = data.variations?.find((v) => v.stock > 0);
        setSelectedVariation(firstAvailable || data.variations?.[0] || null);

        if (data.category_id) {
          const relatedData = await getRelatedProducts(data.category_id, data.id, 3);
          setRelated(relatedData);

          // Default all related look items to unselected
          const initial: Record<string, boolean> = {};
          relatedData.forEach((p) => {
            initial[p.id] = false;
          });
          setSelectedLookItems(initial);
        }
      }
    };
    loadProductData();
  }, [slug, getProductBySlug, getRelatedProducts]);

  const isPreOrder = product?.available_at ? new Date(product.available_at) > new Date() : false;

  // Countdown timer effect
  useEffect(() => {
    if (!product?.available_at) return;

    const target = new Date(product.available_at).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [product?.available_at]);

  const handleAddToCart = () => {
    if (!product || !selectedVariation || !isCustomizationValid) return;

    const basePrice = product.sale_price ?? product.regular_price;
    const finalPrice = isCustomized ? basePrice + 15.00 : basePrice;

    addToCart({
      productId: product.id,
      variationId: selectedVariation.id,
      name: product.name,
      size: selectedVariation.size,
      sku: `${product.sku}-${selectedVariation.size}`,
      price: finalPrice,
      image: product.main_image || '',
      customization: isCustomized ? { name: customName.trim(), number: customNumber.trim() } : undefined
    }, quantity);
  };

  const handleAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alertEmail && product) {
      try {
        const { error: err } = await supabase
          .from('price_alerts')
          .insert({
            email: alertEmail,
            product_id: product.id,
            size: selectedVariation?.size || null,
            alert_type: 'restock'
          });

        if (err) throw err;

        setAlertSuccess(true);
        setTimeout(() => setAlertSuccess(false), 5000);
        setAlertEmail('');

        // Trigger WhatsApp Notification
        triggerWhatsAppNotification('price_alert', {
          product,
          size: selectedVariation?.size || null,
          email: alertEmail,
          alert_type: 'restock'
        });
      } catch (err) {
        console.error('Erro ao registrar alerta de estoque:', err);
      }
    }
  };

  const handleToggleLookItem = (id: string) => {
    setSelectedLookItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddLookToCart = () => {
    if (!product) return;

    // 1. Add main product
    const size = selectedVariation?.size || 'M';
    addToCart({
      productId: product.id,
      variationId: selectedVariation?.id || undefined,
      name: product.name,
      size,
      sku: `${product.sku}-${size}`,
      price: product.sale_price ?? product.regular_price,
      image: product.main_image || '',
    }, quantity);

    // 2. Add selected look items
    related.forEach((prod) => {
      if (selectedLookItems[prod.id]) {
        const firstAvailVar = prod.variations?.find((v) => v.stock > 0) || prod.variations?.[0];
        const lookSize = firstAvailVar?.size || 'M';
        addToCart({
          productId: prod.id,
          variationId: firstAvailVar?.id || undefined,
          name: prod.name,
          size: lookSize,
          sku: `${prod.sku}-${lookSize}`,
          price: prod.sale_price ?? prod.regular_price,
          image: prod.main_image || '',
        }, 1);
      }
    });

    setLookAddedSuccess(true);
    setTimeout(() => setLookAddedSuccess(false), 4000);
  };

  if (loading) {
    return (
      <div className="wrapper-global w-full py-20 text-center animate-pulse">
        <div className="h-8 bg-cinza-claro rounded w-1/4 mx-auto mb-4"></div>
        <div className="h-64 bg-cinza-claro rounded max-w-lg mx-auto"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="wrapper-global w-full py-20 text-center space-y-4">
        <h2 className="font-heading text-3xl text-preto">MANTO NÃO ENCONTRADO</h2>
        <p className="text-cinza-escuro font-light">
          O produto que você procura pode ter sido removido ou está temporariamente indisponível.
        </p>
        <Link
          to="/products"
          className="bg-verde-escuro hover:bg-verde-medio text-branco px-8 py-3 rounded inline-block font-semibold tracking-wider transition-smooth"
        >
          VER PRODUTOS DISPONÍVEIS
        </Link>
      </div>
    );
  }

  const isOutOfStock = !product.variations || product.variations.every((v) => v.stock <= 0);
  const displayPrice = product.sale_price ?? product.regular_price;
  const originalPrice = product.regular_price;
  const isDiscounted = product.sale_price !== null && product.sale_price !== undefined;

  // Calculate Look totals
  const lookItemsPrice = related
    .filter((p) => selectedLookItems[p.id])
    .reduce((sum, p) => sum + (p.sale_price ?? p.regular_price), 0);
  const lookTotalPrice = displayPrice * quantity + lookItemsPrice;

  return (
    <div className="flex-grow">
      {/* Breadcrumbs */}
      <div className="bg-cinza-claro border-b border-cinza-claro/50 py-3">
        <div className="wrapper-global flex items-center space-x-2 text-xs text-cinza-escuro font-light">
          <Link to="/" className="hover:text-verde-medio transition-smooth">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-verde-medio transition-smooth">Camisetas</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/products?category=${product.category.slug}`} className="hover:text-verde-medio transition-smooth">
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-preto font-semibold max-w-[200px] truncate">{product.name}</span>
        </div>
      </div>

      <main className="wrapper-global py-16 space-y-24">
        {/* Upper details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Shirt Image Display */}
          <div className="bg-branco p-6 rounded-lg border border-cinza-claro flex justify-center items-center aspect-square overflow-hidden shadow-xs">
            {product.main_image ? (
              <img
                src={product.main_image}
                alt={product.name}
                className="max-h-[600px] w-auto object-contain hover:scale-102 transition-smooth"
              />
            ) : (
              <span className="text-cinza-escuro/40 uppercase tracking-widest text-xs">Sem Imagem</span>
            )}
          </div>

          {/* Configuration Form / Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              {product.category && (
                <span className="text-xs text-dourado font-bold uppercase tracking-widest block">
                  {product.category.name}
                </span>
              )}
              <h1 className="font-heading text-4xl leading-tight text-preto">{product.name}</h1>
              {product.season && (
                <span className="inline-block bg-verde-claro text-verde-escuro text-xxs font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                  Temporada {product.season}
                </span>
              )}
            </div>

            {/* Price section */}
            <div className="border-y border-cinza-claro py-4">
              <div className="flex items-baseline space-x-3">
                {isDiscounted && (
                  <span className="text-sm text-cinza-escuro line-through">
                    R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <span className="text-3xl font-heading text-dourado leading-none">
                  R$ {displayPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xxs text-cinza-escuro mt-1 font-light">
                Ou em até 3x sem juros de R$ {(displayPrice / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no cartão.
              </p>
            </div>

            {/* Size selector */}
            <div className="space-y-3">
              <h3 className="font-heading text-sm text-preto tracking-wider uppercase">Tamanhos Disponíveis</h3>
              {product.variations && product.variations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((v) => {
                    const isAvailable = v.stock > 0;
                    const isSelected = selectedVariation?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!isAvailable && !isPreOrder}
                        onClick={() => {
                          setSelectedVariation(v);
                          setQuantity(1);
                        }}
                        className={`px-4 py-2 border text-xs font-semibold rounded transition-smooth min-w-[50px] text-center ${
                          !isAvailable && !isPreOrder
                            ? 'bg-cinza-claro text-cinza-escuro/40 border-cinza-claro cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-verde-escuro text-branco border-verde-escuro shadow-xs'
                            : 'bg-branco text-preto border-cinza-escuro/20 hover:border-verde-escuro'
                        }`}
                        aria-label={`Tamanho ${v.size} ${!isAvailable && !isPreOrder ? '(Esgotado)' : ''}`}
                      >
                        {v.size}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-vermelho-alerta font-medium">Nenhum tamanho cadastrado para este produto.</p>
              )}
            </div>

            {/* Customization section */}
            <div className="border-t border-cinza-claro/50 pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="customizationToggle"
                  checked={isCustomized}
                  onChange={(e) => {
                    setIsCustomized(e.target.checked);
                    if (!e.target.checked) {
                      setCustomName('');
                      setCustomNumber('');
                    }
                  }}
                  className="h-4.5 w-4.5 accent-verde-escuro cursor-pointer"
                />
                <label htmlFor="customizationToggle" className="font-heading text-xs text-preto tracking-wider uppercase cursor-pointer select-none">
                  Personalizar com Nome e Número (+ R$ 15,00)
                </label>
              </div>

              {isCustomized && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-cinza-claro/30 border border-cinza-claro rounded-lg p-4 animate-fade-in">
                  {/* Inputs */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-cinza-escuro block">Nome na Camiseta (Máx. 12 letras)</label>
                      <input
                        type="text"
                        placeholder="EX: NEYMAR JR"
                        value={customName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full bg-branco border border-cinza-claro rounded text-xs px-3 py-2 uppercase focus:outline-none focus:ring-1 focus:ring-verde-medio text-preto font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-cinza-escuro block">Número (Máx. 2 dígitos)</label>
                      <input
                        type="text"
                        placeholder="EX: 10"
                        value={customNumber}
                        onChange={(e) => handleNumberChange(e.target.value)}
                        className="w-full bg-branco border border-cinza-claro rounded text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-verde-medio text-preto font-semibold"
                      />
                    </div>
                    <p className="text-[9px] text-cinza-escuro/60 leading-tight">
                      Atenção: verifique a grafia antes de adicionar ao carrinho. Produtos personalizados não podem ser trocados.
                    </p>
                  </div>

                  {/* 3D-like Interactive visualizer mockup */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative bg-preto border border-dourado/30 rounded-lg p-4 flex flex-col items-center justify-center aspect-square w-full max-w-[180px] shadow-md overflow-hidden">
                      {/* Jersey silhouette back SVG */}
                      <svg viewBox="0 0 100 120" className="w-full h-full text-verde-escuro drop-shadow-md">
                        {/* Body */}
                        <path d="M 20 20 L 30 10 L 70 10 L 80 20 L 85 55 L 73 57 L 73 110 L 27 110 L 27 57 L 15 55 Z" fill="currentColor" stroke="#c9a84c" strokeWidth="1" />
                        {/* Sleeves details */}
                        <path d="M 20 20 L 15 55" stroke="#c9a84c" strokeWidth="1" />
                        <path d="M 80 20 L 85 55" stroke="#c9a84c" strokeWidth="1" />
                        {/* Collar */}
                        <path d="M 40 10 A 10 10 0 0 0 60 10 Z" fill="#0d0d0d" stroke="#c9a84c" strokeWidth="1" />
                        {/* Dynamic Name */}
                        <text 
                          x="50" 
                          y="32" 
                          textAnchor="middle" 
                          fill="#c9a84c" 
                          fontSize="7" 
                          fontFamily="'Bebas Neue', sans-serif" 
                          letterSpacing="0.5"
                          className="uppercase font-bold tracking-widest transition-all duration-300"
                        >
                          {customName.trim() || 'SEU NOME'}
                        </text>
                        {/* Dynamic Number */}
                        <text 
                          x="50" 
                          y="75" 
                          textAnchor="middle" 
                          fill="#c9a84c" 
                          fontSize="36" 
                          fontFamily="'Bebas Neue', sans-serif" 
                          className="font-bold transition-all duration-300"
                        >
                          {customNumber.trim() || '10'}
                        </text>
                      </svg>
                      <div className="absolute bottom-1 text-[8px] uppercase tracking-wider text-dourado font-semibold">
                        Pré-visualização
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pre-order countdown section */}
            {isPreOrder && (
              <div className="bg-preto border border-dourado/45 rounded-lg p-5 text-center space-y-3">
                <span className="font-heading text-xs text-dourado tracking-widest block uppercase">Lançamento em Pré-venda</span>
                <div className="flex justify-center gap-4 text-center">
                  <div>
                    <span className="font-heading text-2xl sm:text-3xl block text-branco leading-none">{timeLeft.days}</span>
                    <span className="text-[8px] uppercase text-cinza-escuro font-bold tracking-wider">dias</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-heading text-dourado leading-none">:</div>
                  <div>
                    <span className="font-heading text-2xl sm:text-3xl block text-branco leading-none">{timeLeft.hours}</span>
                    <span className="text-[8px] uppercase text-cinza-escuro font-bold tracking-wider">horas</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-heading text-dourado leading-none">:</div>
                  <div>
                    <span className="font-heading text-2xl sm:text-3xl block text-branco leading-none">{timeLeft.minutes}</span>
                    <span className="text-[8px] uppercase text-cinza-escuro font-bold tracking-wider">minutos</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-heading text-dourado leading-none">:</div>
                  <div>
                    <span className="font-heading text-2xl sm:text-3xl block text-branco leading-none">{timeLeft.seconds}</span>
                    <span className="text-[8px] uppercase text-cinza-escuro font-bold tracking-wider">segundos</span>
                  </div>
                </div>
                <p className="text-[9px] text-cinza-escuro font-light leading-relaxed">
                  Garanta o seu manto exclusivo na pré-venda. O produto será despachado imediatamente após o lançamento oficial.
                </p>
              </div>
            )}

            {/* Quantity and Actions */}
            {isPreOrder ? (
              /* Pre-order Buy button */
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center border border-cinza-escuro/20 rounded h-11 bg-branco">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 h-full hover:text-verde-medio transition-smooth text-lg"
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </button>
                  <span className="px-3 font-semibold text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 h-full hover:text-verde-medio transition-smooth text-lg"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!isCustomizationValid}
                  className="flex-1 bg-dourado hover:bg-dourado-claro disabled:bg-cinza-claro disabled:text-cinza-escuro/65 text-preto h-11 rounded-md font-semibold tracking-wider flex items-center justify-center space-x-2 transition-smooth shadow-md border border-preto/10"
                  aria-label="Reservar camiseta em pré-venda"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>RESERVAR EM PRÉ-VENDA</span>
                </button>
              </div>
            ) : isOutOfStock ? (
              /* Out of stock alert form */
              <div className="bg-cinza-claro/50 border border-cinza-claro rounded-lg p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-heading text-md flex items-center space-x-2 text-preto">
                    <Mail className="h-4 w-4 text-dourado" />
                    <span>AVISE-ME QUANDO ESTIVER DISPONÍVEL</span>
                  </h4>
                  <p className="text-xxs text-cinza-escuro font-light">
                    Cadastre-se para receber um e-mail automático assim que este tamanho for reposto.
                  </p>
                </div>
                <form onSubmit={handleAlertSubmit} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Digite seu e-mail"
                    required
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    className="bg-branco border border-cinza-claro text-xs rounded px-3 py-2 flex-grow focus:outline-none focus:ring-1 focus:ring-verde-medio"
                    aria-label="Email para aviso de disponibilidade"
                  />
                  <button
                    type="submit"
                    className="bg-verde-escuro hover:bg-verde-medio text-branco px-4 py-2 rounded text-xs font-semibold tracking-wider transition-smooth"
                  >
                    AVISAR
                  </button>
                </form>
                {alertSuccess && (
                  <p className="text-xxs text-verde-medio font-semibold">✔ Alerta de reposição cadastrado!</p>
                )}
              </div>
            ) : (
              /* Buy form */
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center border border-cinza-escuro/20 rounded h-11 bg-branco">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 h-full hover:text-verde-medio transition-smooth text-lg"
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </button>
                  <span className="px-3 font-semibold text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedVariation && quantity < selectedVariation.stock) {
                        setQuantity((q) => q + 1);
                      }
                    }}
                    className="px-3 h-full hover:text-verde-medio transition-smooth text-lg"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedVariation || !isCustomizationValid}
                  className="flex-1 bg-verde-escuro hover:bg-verde-medio disabled:bg-cinza-claro text-branco h-11 rounded-md font-semibold tracking-wider flex items-center justify-center space-x-2 transition-smooth shadow-md"
                  aria-label="Adicionar camiseta à sacola de compras"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>ADICIONAR À SACOLA</span>
                </button>
              </div>
            )}

            {/* Calculadora de Frete (Correios) */}
            <div className="border-t border-cinza-claro pt-6 space-y-3">
              <h3 className="font-heading text-sm text-preto tracking-wider uppercase flex items-center space-x-2">
                <Truck className="h-4.5 w-4.5 text-dourado" />
                <span>Simular Frete (Correios)</span>
              </h3>
              <form onSubmit={handleCalculateShipping} className="flex gap-2">
                <input
                  type="text"
                  placeholder="00000-000"
                  required
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className="bg-branco border border-cinza-claro text-xs rounded px-3 py-2 w-36 focus:outline-none focus:ring-1 focus:ring-dourado text-preto font-semibold"
                  aria-label="CEP para cálculo de frete"
                />
                <button
                  type="submit"
                  disabled={calculatingShipping}
                  className="bg-preto hover:bg-verde-medio border border-dourado text-branco px-5 py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth"
                >
                  {calculatingShipping ? 'CALCULANDO...' : 'CALCULAR'}
                </button>
              </form>

              {shippingError && (
                <p className="text-xxs text-vermelho-alerta font-semibold">{shippingError}</p>
              )}

              {shippingResults && (
                <div className="bg-cinza-claro/30 border border-cinza-claro rounded-lg p-4 space-y-2.5 animate-fade-in text-xs">
                  <p className="text-xxs text-cinza-escuro">
                    Opções de entrega para <strong className="text-preto">{shippingResults.city} - {shippingResults.state}</strong>:
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1.5 border-b border-cinza-claro/50">
                      <span className="font-semibold text-preto">PAC (Correios)</span>
                      <span className="text-cinza-escuro text-right">
                        {shippingResults.pac.days} dias úteis •{' '}
                        <strong className="text-dourado">
                          {shippingResults.pac.price === 0
                            ? 'GRÁTIS'
                            : `R$ ${shippingResults.pac.price.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`}
                        </strong>
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="font-semibold text-preto">SEDEX (Correios)</span>
                      <span className="text-cinza-escuro text-right">
                        {shippingResults.sedex.days} dias úteis •{' '}
                        <strong className="text-dourado">
                          R$ {shippingResults.sedex.price.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2 border-t border-cinza-claro pt-6">
                <h3 className="font-heading text-sm text-preto tracking-wider uppercase">Descrição</h3>
                <p className="text-xs text-cinza-escuro leading-relaxed font-light whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Shipping / Trust guarantees info */}
            <div className="grid grid-cols-2 gap-4 border-t border-cinza-claro pt-6 text-xxs font-light">
              <div className="flex items-start space-x-2">
                <Truck className="h-4 w-4 text-verde-medio flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-preto">ENVIO SEGURO</h4>
                  <p className="text-cinza-escuro">Enviado via Correios ou transportadora com código de rastreamento.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <ShieldCheck className="h-4 w-4 text-verde-medio flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-preto">COMPRA PROTEGIDA</h4>
                  <p className="text-cinza-escuro">Devolução grátis e garantia de satisfação ou seu dinheiro de volta.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Montador de Look Section (Related Products) */}
        {related.length > 0 && (
          <div className="space-y-8 border-t border-cinza-claro pt-12">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-cinza-claro pb-5 gap-4">
              <div className="text-center sm:text-left space-y-1">
                <h2 className="font-heading text-2xl tracking-wide flex items-center justify-center sm:justify-start space-x-2 text-preto">
                  <Sparkles className="h-5 w-5 text-dourado animate-pulse-subtle" />
                  <span>MONTE O SEU LOOK COMPLETO</span>
                </h2>
                <p className="text-xxs sm:text-xs text-cinza-escuro font-light">Selecione itens complementares e adicione o look inteiro com um clique.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-cinza-escuro block">Total do Look:</span>
                  <span className="font-heading text-xl text-dourado">R$ {lookTotalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddLookToCart}
                  className="bg-preto hover:bg-verde-medio text-branco px-6 py-3 rounded text-xs font-semibold tracking-wider flex items-center space-x-2 transition-smooth border border-dourado shadow-xs"
                >
                  <ShoppingBag className="h-4 w-4 text-dourado" />
                  <span>COMPRAR LOOK</span>
                </button>
              </div>
            </div>

            {lookAddedSuccess && (
              <p className="text-center text-xs text-verde-medio font-semibold bg-verde-claro/10 py-2.5 rounded border border-verde-claro/20 animate-fade-in">
                ✔ Look completo adicionado à sacola com sucesso!
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((prod) => {
                const isSelected = !!selectedLookItems[prod.id];
                return (
                  <div key={prod.id} className="relative flex flex-col justify-between">
                    {/* Checkbox overlay */}
                    <button
                      type="button"
                      onClick={() => handleToggleLookItem(prod.id)}
                      className="absolute top-4 left-4 z-10 bg-branco/90 border border-cinza-escuro/30 hover:border-verde-escuro rounded p-1.5 flex items-center justify-center transition-smooth"
                      aria-label={isSelected ? 'Remover do Look' : 'Adicionar ao Look'}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // handled by button click
                        className="h-4.5 w-4.5 accent-verde-escuro cursor-pointer" 
                      />
                    </button>
                    <ProductCard product={prod} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
