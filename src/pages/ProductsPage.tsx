import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Search } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import type { Product, Category } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';
import { useSEO } from '../hooks/useSEO';

// Dynamic grouping helper - no static slugs arrays required.

export function ProductsPage() {
  const { getProducts, getCategories, loading } = useProducts();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Read filters from query params
  const categoryFilter = searchParams.get('category') || '';
  const teamTypeFilter = searchParams.get('team_type') || '';
  const searchFilter = searchParams.get('search') || '';

  // Dynamic SEO based on active filters
  const activeCategoryName = categories.find(c => c.slug === categoryFilter)?.name;
  const seoTitle = activeCategoryName 
    ? `Camisas do ${activeCategoryName}` 
    : searchFilter 
    ? `Busca: "${searchFilter}"` 
    : 'Coleção Completa de Camisas';

  useSEO({
    title: seoTitle,
    description: `Confira nossa coleção premium de mantos de futebol. Encontre camisas de clubes e seleções para o seu time do coração${activeCategoryName ? ` como ${activeCategoryName}` : ''}.`
  });

  useEffect(() => {
    const loadFiltersData = async () => {
      const cats = await getCategories();
      setCategories(cats);
    };
    loadFiltersData();
  }, [getCategories]);

  useEffect(() => {
    const loadProductsData = async () => {
      // Find category ID matching the slug
      const selectedCat = categories.find((c) => c.slug === categoryFilter);
      
      let categoryIds: string | string[] | undefined = selectedCat?.id;
      if (selectedCat && selectedCat.type === 'league') {
        const childClubIds = categories
          .filter((c) => c.type === 'club' && c.parent_id === selectedCat.id)
          .map((c) => c.id);
        categoryIds = [selectedCat.id, ...childClubIds];
      }
      
      const prods = await getProducts({
        categoryId: categoryIds,
        teamType: teamTypeFilter || undefined,
        search: searchFilter || undefined,
      });
      setProducts(prods);
    };
    loadProductsData();
  }, [categories, categoryFilter, teamTypeFilter, searchFilter, getProducts]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="flex-grow wrapper-global py-16 flex flex-col lg:flex-row gap-16">
      {/* Desktop Sidebar Filters */}
      <aside className="hidden lg:block w-64 flex-shrink-0 space-y-8">
        <div className="flex items-center justify-between border-b border-cinza-claro pb-4">
          <h2 className="font-heading text-xl tracking-wide flex items-center space-x-2 text-preto">
            <Filter className="h-5 w-5 text-verde-medio" />
            <span>FILTROS</span>
          </h2>
          {(categoryFilter || teamTypeFilter || searchFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-vermelho-alerta hover:underline font-semibold"
            >
              Limpar todos
            </button>
          )}
        </div>

        {/* Categories / Clubs Grouped */}
        <div className="space-y-4">
          <h3 className="font-heading text-sm text-preto tracking-wider uppercase border-b border-cinza-claro pb-2">Clubes / Seleções</h3>
          <div className="flex flex-col space-y-1 text-sm">
            <button
              type="button"
              onClick={() => updateFilter('category', '')}
              className={`text-left hover:text-verde-medio transition-smooth py-1 ${!categoryFilter ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
            >
              Todos os Clubes / Seleções
            </button>
          </div>

          {/* Dynamic Leagues & Clubs */}
          {categories.filter(c => c.type === 'league').map((league) => {
            const leagueClubs = categories.filter(c => c.type === 'club' && c.parent_id === league.id);
            return (
              <div key={league.id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => updateFilter('category', league.slug)}
                  className={`text-left w-full text-[10px] font-bold uppercase tracking-wider mt-2 bg-[#121212]/3 px-2 py-1 rounded flex justify-between items-center ${categoryFilter === league.slug ? 'text-verde-medio bg-verde-claro/10 font-bold border-l-2 border-verde-medio pl-1.5' : 'text-verde-escuro bg-verde-claro/20'}`}
                >
                  <span>{league.name}</span>
                </button>
                {leagueClubs.length > 0 && (
                  <div className="flex flex-col space-y-1 pl-2 text-sm border-l border-verde-medio/30">
                    {leagueClubs.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => updateFilter('category', cat.slug)}
                        className={`text-left hover:text-verde-medio transition-smooth py-0.5 ${categoryFilter === cat.slug ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Clubs without league */}
          {categories.some(c => c.type === 'club' && !c.parent_id) && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-verde-escuro uppercase tracking-wider mt-2 bg-verde-claro/20 px-2 py-0.5 rounded">Outros Clubes</h4>
              <div className="flex flex-col space-y-1 pl-2 text-sm border-l border-verde-medio/30">
                {categories.filter(c => c.type === 'club' && !c.parent_id).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateFilter('category', cat.slug)}
                    className={`text-left hover:text-verde-medio transition-smooth py-0.5 ${categoryFilter === cat.slug ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seleções */}
          {categories.some(c => c.type === 'national') && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-verde-escuro uppercase tracking-wider mt-2 bg-verde-claro/20 px-2 py-0.5 rounded">Seleções Nacionais</h4>
              <div className="flex flex-col space-y-1 pl-2 text-sm border-l border-verde-medio/30">
                {categories.filter(c => c.type === 'national').map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateFilter('category', cat.slug)}
                    className={`text-left hover:text-verde-medio transition-smooth py-0.5 ${categoryFilter === cat.slug ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Team Type */}
        <div className="space-y-3 border-t border-cinza-claro pt-6">
          <h3 className="font-heading text-sm text-preto tracking-wider uppercase">Tipo de Manto</h3>
          <div className="flex flex-col space-y-2 text-sm">
            {[
              { label: 'Todos', value: '' },
              { label: 'Titular', value: 'home' },
              { label: 'Reserva', value: 'away' },
              { label: 'Alternativo', value: 'third' },
              { label: 'Especial', value: 'special' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFilter('team_type', type.value)}
                className={`text-left hover:text-verde-medio transition-smooth py-1 ${teamTypeFilter === type.value ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main products area */}
      <main className="flex-1 space-y-6">
        {/* Top actions & Active filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-cinza-claro pb-4">
          <div>
            <h1 className="font-heading text-3xl tracking-wide text-preto">COLEÇÃO DE CAMISETAS</h1>
            <p className="text-xs text-cinza-escuro font-light">
              {products.length} {products.length === 1 ? 'manto encontrado' : 'mantos encontrados'}.
            </p>
          </div>

          {/* Search bar inside page */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Pesquisar nesta página..."
              value={searchFilter}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="bg-branco border border-cinza-claro text-sm rounded py-2 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-verde-medio w-full"
              aria-label="Pesquisar camisetas"
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-cinza-escuro/60" />
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden w-full bg-verde-escuro text-branco py-3 rounded flex items-center justify-center space-x-2 text-sm font-semibold hover:bg-verde-medio transition-smooth"
          >
            <Filter className="h-4 w-4" />
            <span>FILTRAR PRODUTOS</span>
          </button>
        </div>

        {/* Products Grid */}
          {loading ? (
            <div className="grid-products-fluid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-branco rounded-lg overflow-hidden border border-cinza-claro animate-pulse p-4 space-y-4">
                  <div className="aspect-square bg-cinza-claro rounded"></div>
                  <div className="h-4 bg-cinza-claro rounded w-2/3"></div>
                  <div className="h-6 bg-cinza-claro rounded w-1/3"></div>
                </div>
              ))}
            </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-branco rounded-lg border border-cinza-claro space-y-4">
            <p className="text-cinza-escuro font-light">Nenhum manto sagrado corresponde aos filtros selecionados.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-verde-escuro hover:bg-verde-medio text-branco px-6 py-2.5 rounded text-sm font-semibold tracking-wider transition-smooth"
            >
              VER TODAS AS CAMISETAS
            </button>
          </div>
        ) : (
          <div className="grid-products-fluid animate-fade-in">
            {products.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-preto/50 backdrop-blur-xs" onClick={() => setMobileFiltersOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 pr-10 max-w-full flex">
            <div className="w-screen max-w-xs bg-branco p-6 flex flex-col space-y-6 animate-slide-in-left shadow-2xl">
              <div className="flex items-center justify-between border-b border-cinza-claro pb-4">
                <h2 className="font-heading text-lg tracking-wide flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-verde-medio" />
                  <span>FILTRAR</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Fechar filtros"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Categories / Clubs Grouped */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <h3 className="font-heading text-xs tracking-wider uppercase text-preto border-b pb-1">Clubes / Seleções</h3>
                <div className="flex flex-col space-y-1 text-sm">
                  <button
                    type="button"
                    onClick={() => { updateFilter('category', ''); setMobileFiltersOpen(false); }}
                    className={`text-left py-1.5 ${!categoryFilter ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                  >
                    Todos os Clubes / Seleções
                  </button>
                </div>

                {/* Dynamic Leagues & Clubs */}
                {categories.filter(c => c.type === 'league').map((league) => {
                  const leagueClubs = categories.filter(c => c.type === 'club' && c.parent_id === league.id);
                  return (
                    <div key={league.id} className="space-y-1 mt-2">
                      <button
                        type="button"
                        onClick={() => { updateFilter('category', league.slug); setMobileFiltersOpen(false); }}
                        className={`text-left w-full text-[9px] font-bold uppercase tracking-wider bg-verde-claro/20 px-2 py-0.5 rounded flex justify-between items-center ${categoryFilter === league.slug ? 'text-verde-escuro bg-verde-claro/30 font-extrabold' : 'text-verde-escuro'}`}
                      >
                        <span>{league.name}</span>
                      </button>
                      {leagueClubs.length > 0 && (
                        <div className="flex flex-col space-y-1 pl-2 text-sm border-l border-verde-medio/30">
                          {leagueClubs.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => { updateFilter('category', cat.slug); setMobileFiltersOpen(false); }}
                              className={`text-left py-1 ${categoryFilter === cat.slug ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Clubs without league */}
                {categories.some(c => c.type === 'club' && !c.parent_id) && (
                  <div className="space-y-1 mt-2">
                    <h4 className="text-[9px] font-bold text-verde-escuro uppercase tracking-wider bg-verde-claro/20 px-2 py-0.5 rounded">Outros Clubes</h4>
                    <div className="flex flex-col space-y-1 pl-2 text-sm border-l border-verde-medio/30">
                      {categories.filter(c => c.type === 'club' && !c.parent_id).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { updateFilter('category', cat.slug); setMobileFiltersOpen(false); }}
                          className={`text-left py-1 ${categoryFilter === cat.slug ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seleções */}
                {categories.some(c => c.type === 'national') && (
                  <div className="space-y-1 mt-2">
                    <h4 className="text-[9px] font-bold text-verde-escuro uppercase tracking-wider bg-verde-claro/20 px-2 py-0.5 rounded">Seleções Nacionais</h4>
                    <div className="flex flex-col space-y-1 pl-2 text-sm border-l border-verde-medio/30">
                      {categories.filter(c => c.type === 'national').map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { updateFilter('category', cat.slug); setMobileFiltersOpen(false); }}
                          className={`text-left py-1 ${categoryFilter === cat.slug ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Team Type */}
              <div className="space-y-3 border-t border-cinza-claro pt-4">
                <h3 className="font-heading text-xs tracking-wider uppercase text-preto">Tipo de Manto</h3>
                <div className="flex flex-col space-y-1 text-sm">
                  {[
                    { label: 'Todos', value: '' },
                    { label: 'Titular', value: 'home' },
                    { label: 'Reserva', value: 'away' },
                    { label: 'Alternativo', value: 'third' },
                    { label: 'Especial', value: 'special' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => { updateFilter('team_type', type.value); setMobileFiltersOpen(false); }}
                      className={`text-left py-1.5 ${teamTypeFilter === type.value ? 'text-verde-medio font-semibold' : 'text-cinza-escuro'}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
