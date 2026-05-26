import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Trophy, Shirt, Compass, DollarSign, ArrowLeft, ArrowRight, RefreshCw, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { useSEO } from '../hooks/useSEO';

interface QuizAnswers {
  clubId: string;
  uniformType: 'home' | 'away' | '';
  seasonType: 'new' | 'retro' | '';
  priority: 'street' | 'play' | '';
  maxPrice: number;
}

export function QuizPage() {
  useSEO({
    title: 'Quiz do Torcedor | Encontre o Manto Ideal',
    description: 'Responda 5 perguntas rápidas e descubra qual modelo de camisa combina melhor com sua torcida, estilo e orçamento!'
  });

  const { addToCart } = useCart();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  
  const [answers, setAnswers] = useState<QuizAnswers>({
    clubId: '',
    uniformType: '',
    seasonType: '',
    priority: '',
    maxPrice: 0,
  });

  // Fetch categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      setLoadingCats(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        if (!error && data) {
          setCategories(data as Category[]);
        }
      } catch (err) {
        console.error('Erro ao buscar categorias do quiz:', err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  const handleSelectAnswer = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

  const resetQuiz = () => {
    setAnswers({
      clubId: '',
      uniformType: '',
      seasonType: '',
      priority: '',
      maxPrice: 0,
    });
    setRecommendations([]);
    setStep(1);
  };

  const getRecommendations = useCallback(async () => {
    setLoadingResults(true);
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('active', true);

      if (answers.clubId && answers.clubId !== 'all') {
        query = query.eq('category_id', answers.clubId);
      }

      if (answers.uniformType) {
        query = query.eq('team_type', answers.uniformType);
      }

      if (answers.seasonType === 'new') {
        query = query.eq('season', '2024/25');
      } else if (answers.seasonType === 'retro') {
        query = query.ilike('season', '%retro%');
      }

      if (answers.maxPrice > 0) {
        query = query.lte('regular_price', answers.maxPrice);
      }

      const { data, error } = await query.limit(3);

      if (error) throw error;

      if (data && data.length > 0) {
        setRecommendations(data as Product[]);
      } else {
        // Fallback: load 3 featured products if no match
        const { data: fallbackData } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('active', true)
          .eq('featured', true)
          .limit(3);

        setRecommendations((fallbackData || []) as Product[]);
      }
    } catch (err) {
      console.error('Erro ao buscar recomendações:', err);
    } finally {
      setLoadingResults(false);
    }
  }, [answers]);

  // Fetch results when reaching the last step
  useEffect(() => {
    if (step === 6) {
      getRecommendations();
    }
  }, [step, getRecommendations]);

  const handleAddRecommendedToCart = (prod: Product) => {
    // Default variations select logic
    const firstVar = prod.variations?.[0] || { id: '', size: 'M' };
    addToCart({
      productId: prod.id,
      variationId: firstVar.id || undefined,
      name: prod.name,
      size: firstVar.size || 'M',
      sku: `${prod.sku}-${firstVar.size || 'M'}`,
      price: prod.sale_price ?? prod.regular_price,
      image: prod.main_image || '',
    }, 1);
  };

  return (
    <div 
      className="flex-grow w-full py-16 relative bg-preto flex items-center justify-center min-h-[80vh]"
      style={{
        backgroundImage: "url('/background-loja.jfif')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-preto/80 z-0"></div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4">
        {step < 6 && (
          <div className="bg-branco/95 backdrop-blur-md rounded-2xl p-8 sm:p-10 border border-cinza-claro shadow-2xl space-y-8 animate-fade-in">
            {/* Header info */}
            <div className="text-center space-y-2 border-b border-cinza-claro pb-5">
              <span className="text-dourado font-heading tracking-widest text-xs uppercase flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> QUIZ DO TORCEDOR <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-heading text-3xl text-preto">ENCONTRE O SEU MANTO IDEAL</h2>
              <div className="w-full bg-cinza-claro h-1 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-verde-escuro h-full transition-all duration-500" 
                  style={{ width: `${(step / 5) * 100}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-cinza-escuro/60 font-semibold uppercase tracking-wider pt-2">Passo {step} de 5</p>
            </div>

            {/* Steps Rendering */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-heading text-xl text-preto flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-dourado" /> Qual clube ou seleção você quer representar?
                  </h3>
                  <p className="text-xs text-cinza-escuro">Selecione o time do seu coração ou escolha "Qualquer um" para ver todos.</p>
                </div>

                {loadingCats ? (
                  <div className="text-center py-10 animate-pulse text-xs text-cinza-escuro">Carregando clubes...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer('clubId', 'all')}
                      className={`p-3 border rounded-lg text-xs font-semibold transition-smooth text-center ${
                        answers.clubId === 'all'
                          ? 'bg-verde-escuro text-branco border-verde-escuro'
                          : 'bg-branco text-preto border-cinza-escuro/10 hover:border-verde-escuro'
                      }`}
                    >
                      Todos os Clubes
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectAnswer('clubId', cat.id)}
                        className={`p-3 border rounded-lg text-xs font-semibold transition-smooth text-center truncate ${
                          answers.clubId === cat.id
                            ? 'bg-verde-escuro text-branco border-verde-escuro'
                            : 'bg-branco text-preto border-cinza-escuro/10 hover:border-verde-escuro'
                        }`}
                        title={cat.name}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-heading text-xl text-preto flex items-center justify-center gap-2">
                    <Shirt className="h-5 w-5 text-verde-medio" /> Qual tipo de uniforme você prefere?
                  </h3>
                  <p className="text-xs text-cinza-escuro">Escolha entre a clássica camisa titular ou a reserva.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Titular (Casa)', value: 'home', desc: 'As cores principais.' },
                    { label: 'Reserva (Fora)', value: 'away', desc: 'Design alternativo de visitante.' },
                    { label: 'Tanto Faz / Neutro', value: '', desc: 'Qualquer opção disponível.' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectAnswer('uniformType', opt.value as any)}
                      className={`p-5 border rounded-xl text-left transition-smooth flex flex-col justify-between h-32 ${
                        answers.uniformType === opt.value
                          ? 'bg-verde-escuro text-branco border-verde-escuro shadow-xs'
                          : 'bg-branco text-preto border-cinza-escuro/10 hover:border-verde-escuro'
                      }`}
                    >
                      <span className="font-heading text-sm uppercase tracking-wider">{opt.label}</span>
                      <span className={`text-xxs font-light ${answers.uniformType === opt.value ? 'text-verde-claro/85' : 'text-cinza-escuro'}`}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-heading text-xl text-preto flex items-center justify-center gap-2">
                    <Compass className="h-5 w-5 text-verde-medio" /> Qual é o seu estilo favorito de temporada?
                  </h3>
                  <p className="text-xs text-cinza-escuro">Você busca os lançamentos mais recentes ou a nostalgia dos modelos retrô?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Nova Coleção', value: 'new', desc: 'Uniformes mais recentes do ano.' },
                    { label: 'Modelos Retrô', value: 'retro', desc: 'Camisas clássicas que marcaram história.' },
                    { label: 'Qualquer Estilo', value: '', desc: 'Estou aberto a qualquer temporada.' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectAnswer('seasonType', opt.value as any)}
                      className={`p-5 border rounded-xl text-left transition-smooth flex flex-col justify-between h-32 ${
                        answers.seasonType === opt.value
                          ? 'bg-verde-escuro text-branco border-verde-escuro shadow-xs'
                          : 'bg-branco text-preto border-cinza-escuro/10 hover:border-verde-escuro'
                      }`}
                    >
                      <span className="font-heading text-sm uppercase tracking-wider">{opt.label}</span>
                      <span className={`text-xxs font-light ${answers.seasonType === opt.value ? 'text-verde-claro/85' : 'text-cinza-escuro'}`}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-heading text-xl text-preto flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5 text-dourado" /> Qual é o seu objetivo principal com o manto?
                  </h3>
                  <p className="text-xs text-cinza-escuro">Onde você vai usar mais a sua nova camisa?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Uso Casual / Rolê', value: 'street', desc: 'Modelos confortáveis para o dia a dia.' },
                    { label: 'Performance / Jogar', value: 'play', desc: 'Tecido leve e respirável para o futebol.' },
                    { label: 'Ambos', value: '', desc: 'Versatilidade total para todas as situações.' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectAnswer('priority', opt.value as any)}
                      className={`p-5 border rounded-xl text-left transition-smooth flex flex-col justify-between h-32 ${
                        answers.priority === opt.value
                          ? 'bg-verde-escuro text-branco border-verde-escuro shadow-xs'
                          : 'bg-branco text-preto border-cinza-escuro/10 hover:border-verde-escuro'
                      }`}
                    >
                      <span className="font-heading text-sm uppercase tracking-wider">{opt.label}</span>
                      <span className={`text-xxs font-light ${answers.priority === opt.value ? 'text-verde-claro/85' : 'text-cinza-escuro'}`}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-heading text-xl text-preto flex items-center justify-center gap-2">
                    <DollarSign className="h-5 w-5 text-verde-medio" /> Qual a sua faixa de preço ideal?
                  </h3>
                  <p className="text-xs text-cinza-escuro">Filtre as camisetas que cabem perfeitamente no seu bolso.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Até R$ 150', value: 150 },
                    { label: 'Até R$ 200', value: 200 },
                    { label: 'Até R$ 250', value: 250 },
                    { label: 'Sem limite', value: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectAnswer('maxPrice', opt.value)}
                      className={`p-4 border rounded-xl text-center transition-smooth flex flex-col justify-center items-center h-24 ${
                        answers.maxPrice === opt.value
                          ? 'bg-verde-escuro text-branco border-verde-escuro shadow-xs'
                          : 'bg-branco text-preto border-cinza-escuro/10 hover:border-verde-escuro'
                      }`}
                    >
                      <span className="font-heading text-sm uppercase tracking-wider block">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between border-t border-cinza-claro pt-6">
              <button
                type="button"
                disabled={step === 1}
                onClick={handlePrevStep}
                className={`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2.5 rounded transition-smooth ${
                  step === 1 ? 'opacity-30 cursor-not-allowed text-cinza-escuro' : 'text-preto hover:bg-cinza-claro'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={step === 1 && !answers.clubId}
                className={`bg-preto text-branco hover:bg-verde-medio border border-dourado px-6 py-2.5 rounded text-xs font-semibold tracking-wider flex items-center space-x-1.5 transition-smooth shadow-xs ${
                  step === 1 && !answers.clubId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>{step === 5 ? 'Ver Resultados' : 'Continuar'}</span>
                <ArrowRight className="h-4 w-4 text-dourado" />
              </button>
            </div>
          </div>
        )}

        {/* Results Page */}
        {step === 6 && (
          <div className="bg-branco/95 backdrop-blur-md rounded-2xl p-8 sm:p-10 border border-cinza-claro shadow-2xl space-y-8 animate-fade-in text-center">
            <div className="space-y-2 border-b border-cinza-claro pb-5">
              <span className="text-dourado font-heading tracking-widest text-xs uppercase flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> SUAS RECOMENDAÇÕES <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-heading text-3xl text-preto">MANTOS SUGERIDOS PARA VOCÊ</h2>
              <p className="text-xs text-cinza-escuro font-light">Com base nas suas preferências, selecionamos as melhores opções abaixo:</p>
            </div>

            {loadingResults ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="h-8 w-8 text-verde-escuro animate-spin" />
                <p className="text-xs text-cinza-escuro font-light">Analisando o catálogo e buscando os melhores mantos...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-16 space-y-4">
                <p className="text-sm text-cinza-escuro font-light">Não encontramos nenhuma camisa com esses filtros exatos.</p>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="bg-preto text-branco border border-dourado hover:bg-verde-medio px-6 py-3 rounded text-xs font-semibold tracking-wider transition-smooth"
                >
                  RECOMEÇAR QUIZ
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Product display list */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {recommendations.map((prod) => (
                    <div 
                      key={prod.id} 
                      className="bg-branco rounded-xl border border-cinza-claro overflow-hidden flex flex-col justify-between shadow-xs group hover:border-dourado/45 transition-smooth"
                    >
                      <div className="aspect-square bg-cinza-claro/30 flex items-center justify-center p-3 relative">
                        {prod.main_image ? (
                          <img 
                            src={prod.main_image} 
                            alt={prod.name} 
                            className="max-h-full object-contain group-hover:scale-103 transition-smooth" 
                          />
                        ) : (
                          <span className="text-[10px] uppercase text-cinza-escuro/45 font-light">Sem Foto</span>
                        )}
                        {prod.featured && (
                          <span className="absolute top-2 left-2 bg-dourado text-preto text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                            Destaque
                          </span>
                        )}
                      </div>

                      <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                        <div className="text-left space-y-1">
                          <h4 className="font-heading text-md text-preto line-clamp-1 group-hover:text-verde-escuro transition-smooth">
                            {prod.name}
                          </h4>
                          <span className="text-dourado font-heading text-sm">
                            R$ {Number(prod.regular_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <Link 
                            to={`/product/${prod.slug}`} 
                            className="w-full text-center border border-cinza-escuro/20 hover:border-preto text-preto py-2 rounded text-xxs font-bold block tracking-wider uppercase transition-smooth"
                          >
                            Ver Detalhes
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleAddRecommendedToCart(prod)}
                            className="w-full bg-preto text-branco hover:bg-verde-medio py-2 rounded text-xxs font-bold flex items-center justify-center space-x-1.5 tracking-wider uppercase transition-smooth border border-dourado/30"
                          >
                            <ShoppingCart className="h-3 w-3 text-dourado" />
                            <span>Comprar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer options */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 border-t border-cinza-claro pt-6">
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="border border-cinza-escuro/30 hover:bg-cinza-claro/50 text-preto px-6 py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth"
                  >
                    REFAZER QUIZ
                  </button>
                  <Link
                    to="/products"
                    className="bg-preto text-branco hover:bg-verde-medio border border-dourado px-6 py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth shadow-xs"
                  >
                    VER TODAS AS CAMISETAS
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
