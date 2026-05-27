import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight, ArrowRight, ShieldCheck, Truck, RefreshCw, ChevronLeft } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import type { Product, Category } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';
import { useSEO } from '../hooks/useSEO';
import { useSettings } from '../context/SettingsContext';
import { getOptimizedImageUrl } from '../utils/image';

export function HomePage() {
  const { settings } = useSettings();

  useSEO({
    title: `${settings.store_name} | ${settings.store_tagline}`,
    description: settings.hero_subtitle
  });

  const { getProducts, getCategories, loading, error } = useProducts();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const handlePrevHeroProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentHeroIndex((prev) => (prev === 0 ? featuredProducts.length - 1 : prev - 1));
  };

  const handleNextHeroProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentHeroIndex((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    // Load featured products and categories
    const loadData = async () => {
      const prods = await getProducts({ featured: true });
      const cats = await getCategories();
      setFeaturedProducts(prods.slice(0, 6)); // Display top 6
      setCategories(cats.slice(0, 6)); // Display top 6 clubs
    };
    loadData();
  }, [getProducts, getCategories]);

  const activeHeroProduct = featuredProducts[currentHeroIndex];

  return (
    <div className="flex-grow flex flex-col">
      {/* Hero Section */}
      <section 
        className="relative overflow-hidden text-branco py-24 lg:py-36 bg-preto"
        style={{ 
          backgroundImage: "url('/background-loja.jfif')", 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      >
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-preto/50 z-0"></div>

        <div className="wrapper-global relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="space-y-6 animate-fade-in text-center lg:text-left flex flex-col items-center lg:items-start">
            <span className="inline-flex items-center space-x-2 bg-dourado/20 text-dourado-claro text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-dourado" />
              Coleções 2024/25
            </span>
            <h1 className="text-hero-title font-heading tracking-tight leading-none uppercase">
              {settings.hero_title}
            </h1>
            <p className="text-body-highlight text-verde-claro/90 max-w-xl font-light leading-relaxed mx-auto lg:mx-0">
              {settings.hero_subtitle}
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
              <Link 
                to="/products" 
                className="bg-dourado hover:bg-dourado-claro text-preto px-8 py-3 rounded-md font-semibold tracking-wider flex items-center space-x-2 shadow-lg transition-smooth transform hover:-translate-y-0.5"
              >
                <span>COMPRAR AGORA</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                to="/quiz" 
                className="border border-verde-claro/30 hover:border-dourado hover:text-dourado px-8 py-3 rounded-md font-medium tracking-wider flex items-center space-x-2 transition-smooth"
              >
                <span>QUIZ DO TORCEDOR</span>
                <Sparkles className="h-4 w-4 text-dourado" />
              </Link>
            </div>
          </div>

          {/* Featured Carousel Visual */}
          <div className="relative flex justify-center lg:justify-end animate-fade-in w-full">
            <Link 
              to={activeHeroProduct ? `/product/${activeHeroProduct.slug}` : '/products'} 
              className="relative w-full max-w-[450px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-dourado/30 bg-preto flex flex-col justify-end p-6 group transition-all duration-300 hover:border-dourado hover:shadow-[0_0_25px_rgba(201,168,76,0.25)] select-none"
            >
              {activeHeroProduct?.main_image ? (
                <img 
                  src={getOptimizedImageUrl(activeHeroProduct.main_image, 600)} 
                  alt={activeHeroProduct.name} 
                  className="absolute inset-0 object-cover w-full h-full group-hover:scale-105 transition-smooth"
                  fetchPriority="high"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-verde-medio to-preto flex items-center justify-center p-8">
                  <img src="/logo.webp" alt="Bananinha Store" className="w-32 h-32 object-contain opacity-45" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-preto/95 via-preto/10 to-transparent pointer-events-none"></div>
              
              {/* Carousel Controls */}
              {featuredProducts.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 pointer-events-none z-20">
                  <button
                    type="button"
                    onClick={handlePrevHeroProduct}
                    className="p-2 rounded-full bg-preto/70 hover:bg-dourado text-branco hover:text-preto border border-dourado/20 pointer-events-auto transition-smooth shadow-md"
                    aria-label="Produto anterior em destaque"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextHeroProduct}
                    className="p-2 rounded-full bg-preto/70 hover:bg-dourado text-branco hover:text-preto border border-dourado/20 pointer-events-auto transition-smooth shadow-md"
                    aria-label="Próximo produto em destaque"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="relative z-10 text-left">
                <span className="text-dourado font-bold text-xs uppercase tracking-widest block mb-1">
                  {activeHeroProduct ? 'Em Destaque' : 'Manto Sagrado'}
                </span>
                <h3 className="font-heading text-2xl text-branco leading-tight group-hover:text-dourado-claro transition-smooth">
                  {activeHeroProduct ? activeHeroProduct.name : 'Manto Especial'}
                </h3>
                
                {activeHeroProduct ? (
                  activeHeroProduct.sale_price ? (
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="font-heading text-xl text-dourado">
                        R$ {activeHeroProduct.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-cinza-claro/60 line-through">
                        R$ {activeHeroProduct.regular_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <p className="font-heading text-xl text-dourado mt-1">
                      R$ {activeHeroProduct.regular_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )
                ) : (
                  <p className="text-sm text-dourado font-semibold mt-1">Ver Modelos</p>
                )}
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-branco border-b border-cinza-claro py-12">
        <div className="wrapper-global grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-cols p-4 space-y-3">
            <Truck className="h-12 w-12 text-verde-medio" />
            <h4 className="font-heading text-xl text-preto">ENTREGA RÁPIDA</h4>
            <p className="text-sm text-cinza-escuro font-light leading-relaxed">Envio seguro para todo o Brasil com rastreamento completo.</p>
          </div>
          <div className="flex flex-col items-center p-4 space-y-3 border-y md:border-y-0 md:border-x border-cinza-claro">
            <ShieldCheck className="h-12 w-12 text-verde-medio" />
            <h4 className="font-heading text-xl text-preto">QUALIDADE GARANTIDA</h4>
            <p className="text-sm text-cinza-escuro font-light leading-relaxed">Camisetas selecionadas com garantia de costura e tecido.</p>
          </div>
          <div className="flex flex-col items-center p-4 space-y-3">
            <RefreshCw className="h-12 w-12 text-verde-medio" />
            <h4 className="font-heading text-xl text-preto">FÁCIL DEVOLUÇÃO</h4>
            <p className="text-sm text-cinza-escuro font-light leading-relaxed">Até 7 dias para realizar trocas ou devoluções sem burocracia.</p>
          </div>
        </div>
      </section>

      {/* Clubs Filter Icons Grid */}
      <section className="py-16 bg-cinza-claro/30">
        <div className="wrapper-global">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-section-title font-heading tracking-wide text-preto">COMPRE PELO SEU CLUBE</h2>
            <div className="w-12 h-1 bg-dourado mx-auto"></div>
          </div>

          {categories.length === 0 ? (
            <div className="grid-categories-adaptive">
              {['Flamengo', 'Premier League', 'La Liga', 'Série A', 'Seleções', 'Retrô'].map((name) => (
                <Link
                  key={name}
                  to="/products"
                  className="bg-branco border border-cinza-claro p-8 rounded-lg text-center font-heading text-xl tracking-wider hover:text-verde-medio hover:border-verde-medio transition-smooth shadow-xs hover:shadow-md"
                >
                  {name}
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid-categories-adaptive">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="bg-branco border border-cinza-claro p-8 rounded-lg text-center font-heading text-xl tracking-wider hover:text-verde-medio hover:border-verde-medio transition-smooth shadow-xs hover:shadow-md"
                >
                  {cat.name.toUpperCase()}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="py-16 bg-branco">
        <div className="wrapper-global">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-section-title font-heading tracking-wide text-preto">PRODUTOS EM DESTAQUE</h2>
              <p className="text-xs sm:text-sm text-cinza-escuro font-light">As camisetas mais cobiçadas do momento.</p>
            </div>
            <Link
              to="/products"
              className="text-verde-escuro hover:text-verde-medio font-semibold text-xs tracking-wider flex items-center space-x-1 uppercase"
            >
              <span>Ver todas</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid-products-fluid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-branco rounded-lg overflow-hidden border border-cinza-claro animate-pulse p-4 space-y-4">
                  <div className="aspect-square bg-cinza-claro rounded"></div>
                  <div className="h-4 bg-cinza-claro rounded w-2/3"></div>
                  <div className="h-6 bg-cinza-claro rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-vermelho-alerta font-medium">
              Erro ao carregar produtos: {error}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12 text-cinza-escuro font-light">
              Nenhum produto em destaque encontrado. Cadastre itens no painel para exibi-los aqui.
            </div>
          ) : (
            <div className="grid-products-fluid">
              {featuredProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quiz Banner */}
      <section className="bg-verde-escuro text-branco py-20 relative overflow-hidden border-t-4 border-dourado">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#2d6a4f,transparent)] opacity-40"></div>
        <div className="wrapper-global text-center relative z-10 space-y-6">
          <Sparkles className="h-10 w-10 text-dourado mx-auto animate-pulse-subtle" />
          <h2 className="text-section-title font-heading tracking-wide">ENCONTRE O MANTO IDEAL</h2>
          <p className="text-verde-claro/95 text-body-highlight font-light max-w-2xl mx-auto leading-relaxed">
            Responda 5 perguntas rápidas e descubra qual modelo de camisa combina melhor com sua torcida, estilo e orçamento!
          </p>
          <div>
            <Link 
              to="/quiz" 
              className="bg-dourado hover:bg-dourado-claro text-preto px-10 py-4 rounded-md font-bold tracking-widest uppercase shadow-lg inline-flex items-center space-x-3 transition-smooth"
            >
              <span>INICIAR QUIZ DO TORCEDOR</span>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
