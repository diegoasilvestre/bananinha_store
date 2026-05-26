import { useEffect, useState } from 'react';
import { X, Upload, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadProductImage } from '../../lib/storage';
import type { Category, Product } from '../../hooks/useProducts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  productToEdit?: Product | null;
}

interface LocalVariation {
  size: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG' | 'Único';
  stock: number;
}

export function ProductModal({ isOpen, onClose, onSave, productToEdit }: ProductModalProps) {
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [season, setSeason] = useState('');
  const [teamType, setTeamType] = useState<'home' | 'away' | 'third' | 'goalkeeper' | 'special'>('home');
  const [regularPrice, setRegularPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [mainImage, setMainImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  // Variations state
  const [variations, setVariations] = useState<LocalVariation[]>([]);

  // Details images state
  const [detailImages, setDetailImages] = useState<string[]>([]);
  // Bucket library state
  const [bucketImages, setBucketImages] = useState<string[]>([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New category inline creation
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'club' | 'league' | 'national'>('club');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [newLeagueName, setNewLeagueName] = useState('');

  // Load existing categories (including inactive for admin)
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catErr) {
        console.error('Erro ao carregar categorias:', catErr);
        return;
      }

      const cats = (data || []) as Category[];
      setCategories(cats);
    };
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Load product to edit
  useEffect(() => {
    if (!isOpen) return;

    if (productToEdit) {
      setSku(productToEdit.sku || '');
      setName(productToEdit.name || '');
      setSlug(productToEdit.slug || '');
      setDescription(productToEdit.description || '');
      setShortDesc(productToEdit.short_desc || '');
      setCategoryId(productToEdit.category_id || '');
      setSeason(productToEdit.season || '');
      setTeamType(productToEdit.team_type || 'home');
      setRegularPrice(productToEdit.regular_price || 0);
      setSalePrice(productToEdit.sale_price !== null && productToEdit.sale_price !== undefined ? productToEdit.sale_price : '');
      setMainImage(productToEdit.main_image || '');
      setDetailImages(productToEdit.images || []);
      setFeatured(!!productToEdit.featured);
      setActive(!!productToEdit.active);

      // Map variations
      if (productToEdit.variations) {
        const mapped = productToEdit.variations.map((v) => ({
          size: v.size,
          stock: v.stock
        }));
        setVariations(mapped);
      } else {
        setVariations([]);
      }
    } else {
      // Clear form
      setSku('');
      setName('');
      setSlug('');
      setDescription('');
      setShortDesc('');
      setCategoryId('');
      setSeason('');
      setTeamType('home');
      setRegularPrice(0);
      setSalePrice('');
      setMainImage('');
      setDetailImages([]);
      setFeatured(false);
      setActive(true);
      setVariations([
        { size: 'P', stock: 10 },
        { size: 'M', stock: 10 },
        { size: 'G', stock: 10 },
        { size: 'GG', stock: 10 },
        { size: 'XGG', stock: 10 }
      ]);
    }
  }, [productToEdit, isOpen]);

  // Generate slug dynamically from name
  useEffect(() => {
    if (!productToEdit && name) {
      const cleanSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setSlug(cleanSlug);
    }
  }, [name, productToEdit]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB - will be compressed)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido para seleção: 10MB.`);
      return;
    }

    // Validate file format (HEIC/HEIF agora suportado via heic2any)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isSupported = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fileExt || '');

    if (!isSupported) {
      setError('Formato de arquivo não suportado. Por favor, envie imagens JPG, PNG, WEBP ou HEIC.');
      return;
    }

    setUploading(true);
    setError(null);
    const url = await uploadProductImage(file);
    setUploading(false);

    if (url) {
      setMainImage(url);
    } else {
      setError(
        'Falha ao realizar o upload da imagem. Verifique se as políticas de Storage (RLS) foram configuradas no Supabase. ' +
        'Execute o SQL de configuração no Supabase SQL Editor.'
      );
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          setError(`Ignorado "${file.name}": arquivo muito grande (máximo 10MB).`);
          continue;
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fileExt || '')) {
          setError(`Ignorado "${file.name}": formato não suportado. Use JPG, PNG, WEBP ou HEIC.`);
          continue;
        }

        const url = await uploadProductImage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        setDetailImages((prev) => [...prev, ...uploadedUrls]);
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao enviar algumas imagens.');
    } finally {
      setUploading(false);
    }
  };

  const fetchLibraryImages = async () => {
    setLoadingLibrary(true);
    try {
      const { data: rootData, error: rootError } = await supabase.storage
        .from('products')
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (rootError) throw rootError;

      interface FileWithTimestamp {
        path: string;
        createdAt: string;
      }

      const files: FileWithTimestamp[] = [];
      const items = (rootData || []) as unknown as {
        name: string;
        id: string | null;
        created_at: string | null;
        metadata: Record<string, unknown> | null;
      }[];

      for (const item of items) {
        if (item.name === '.emptyFolderPlaceholder') continue;

        if (item.id && item.metadata) {
          files.push({
            path: item.name,
            createdAt: item.created_at || new Date(0).toISOString()
          });
        } else {
          const { data: subData, error: subError } = await supabase.storage
            .from('products')
            .list(item.name, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

          if (subError) {
            console.error(`Erro ao listar subpasta ${item.name}:`, subError);
            continue;
          }

          const subItems = (subData || []) as unknown as {
            name: string;
            created_at: string | null;
          }[];

          for (const subItem of subItems) {
            if (subItem.name === '.emptyFolderPlaceholder') continue;
            files.push({
              path: `${item.name}/${subItem.name}`,
              createdAt: subItem.created_at || new Date(0).toISOString()
            });
          }
        }
      }

      files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const urls = files
        .map((file) => {
          const { data: urlData } = supabase.storage
            .from('products')
            .getPublicUrl(file.path);
          return urlData?.publicUrl || '';
        })
        .filter(Boolean);

      setBucketImages(urls);
    } catch (err) {
      console.error('Erro ao carregar galeria:', err);
      setError('Não foi possível listar as imagens do bucket.');
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (showImageLibrary) {
      fetchLibraryImages();
    }
  }, [showImageLibrary]);

  const handleAddVariation = () => {
    // Add default variation size P
    setVariations([...variations, { size: 'P', stock: 10 }]);
  };

  const handleVariationChange = (index: number, key: keyof LocalVariation, value: string | number) => {
    const updated = [...variations];
    if (key === 'size') {
      updated[index].size = value as LocalVariation['size'];
    } else {
      updated[index].stock = Number(value);
    }
    setVariations(updated);
  };

  const handleRemoveVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payloadProduct = {
        sku,
        name,
        slug,
        description: description || null,
        short_desc: shortDesc || null,
        category_id: categoryId || null,
        season: season || null,
        team_type: teamType,
        regular_price: regularPrice,
        sale_price: salePrice !== '' ? Number(salePrice) : null,
        main_image: mainImage || null,
        images: detailImages,
        featured,
        active
      };

      let productId = '';

      if (productToEdit) {
        // Edit product
        const { error: prodErr } = await supabase
          .from('products')
          .update(payloadProduct)
          .eq('id', productToEdit.id);

        if (prodErr) throw prodErr;
        productId = productToEdit.id;

        // Delete old variations
        const { error: delErr } = await supabase
          .from('product_variations')
          .delete()
          .eq('product_id', productId);

        if (delErr) throw delErr;
      } else {
        // Create product
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert(payloadProduct)
          .select()
          .single();

        if (prodErr) throw prodErr;
        if (!newProd) throw new Error('Erro ao registrar o produto.');
        productId = newProd.id;
      }

      // Insert variations
      if (variations.length > 0) {
        const variationsToInsert = variations.map((v) => ({
          product_id: productId,
          size: v.size,
          stock: v.stock,
          active: true
        }));

        const { error: varErr } = await supabase
          .from('product_variations')
          .insert(variationsToInsert);

        if (varErr) throw varErr;
      }

      onSave();
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao salvar o produto';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0d] overflow-y-auto text-branco flex flex-col animate-fade-in" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cinza-escuro/20 p-6 bg-[#0a0a0a] sticky top-0 z-20">
        <h2 className="font-heading text-2xl tracking-wide text-branco uppercase">
          {productToEdit ? 'EDITAR CAMISETA' : 'CADASTRAR NOVA CAMISETA'}
        </h2>
        <button type="button" onClick={onClose} className="text-cinza-claro hover:text-branco hover:bg-cinza-escuro/40 p-2 rounded-full transition-smooth">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-grow p-6 md:p-8 max-w-7xl mx-auto w-full">
        {error && (
          <div className="mb-6 bg-vermelho-alerta/15 border border-vermelho-alerta/35 text-vermelho-alerta p-3 rounded text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Core information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Código SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="EX: FLA-HOME-24"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase().trim())}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado uppercase text-branco placeholder-cinza-escuro/50"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Slug da URL *</label>
                    <input
                      type="text"
                      required
                      placeholder="flamengo-home-2024"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-cinza-claro block">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Camiseta Flamengo Home 2024/25"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-start">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Clube / Liga *</label>
                    <div className="flex items-center gap-1.5 w-full">
                      <select
                        value={categoryId}
                        required
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full truncate bg-[#161616] border border-[#2a2a2a] rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco font-semibold"
                      >
                        <option value="" className="text-cinza-escuro">— Selecione —</option>
                        {categories.filter(c => c.type === 'club').length > 0 && (
                          <optgroup label="Clubes" className="bg-[#0d0d0d] text-cinza-claro">
                            {categories.filter(c => c.type === 'club').map((cat) => (
                              <option key={cat.id} value={cat.id} className="text-branco bg-[#0d0d0d]">
                                {cat.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {categories.filter(c => c.type === 'national').length > 0 && (
                          <optgroup label="Seleções Nacionais" className="bg-[#0d0d0d] text-cinza-claro">
                            {categories.filter(c => c.type === 'national').map((cat) => (
                              <option key={cat.id} value={cat.id} className="text-branco bg-[#0d0d0d]">
                                {cat.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {categories.filter(c => c.type === 'league').length > 0 && (
                          <optgroup label="Ligas / Campeonatos" className="bg-[#0d0d0d] text-cinza-claro">
                            {categories.filter(c => c.type === 'league').map((cat) => (
                              <option key={cat.id} value={cat.id} className="text-branco bg-[#0d0d0d]">
                                {cat.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {categoryId && (
                        <button
                          type="button"
                          onClick={async () => {
                            const selectedCatName = categories.find(c => c.id === categoryId)?.name;
                            if (!selectedCatName) return;
                            if (!window.confirm(`Tem certeza que deseja excluir a categoria "${selectedCatName}"?`)) return;

                            try {
                              const { error: err } = await supabase
                                .from('categories')
                                .delete()
                                .eq('id', categoryId);

                              if (err) throw err;

                              setCategories(categories.filter(c => c.id !== categoryId));
                              setCategoryId('');
                              alert('Categoria excluída com sucesso!');
                            } catch (err: any) {
                              console.error('Erro ao excluir categoria:', err);
                              alert(`Erro ao excluir categoria: ${err.message || 'Verifique se existem produtos associados a ela.'}`);
                            }
                          }}
                          className="text-vermelho-alerta hover:text-red-400 p-1.5 hover:bg-[#1c1c1c]/40 rounded transition-smooth"
                          title="Excluir categoria selecionada"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(!showNewCategory)}
                        className="text-dourado hover:text-dourado-claro p-1.5 hover:bg-[#1c1c1c] rounded transition-smooth"
                        title="Criar nova categoria"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {showNewCategory && (
                      <div className="flex flex-col gap-2 mt-2 p-3 bg-[#131313] border border-[#262626] rounded text-xs space-y-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-cinza-claro block">Nome do Clube/Liga/País</label>
                          <input
                            type="text"
                            placeholder="EX: Flamengo, Brasil"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-dourado text-branco font-semibold placeholder-cinza-escuro/50"
                          />
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-semibold text-cinza-claro block">Tipo</label>
                            <select
                              value={newCategoryType}
                              onChange={(e) => {
                                setNewCategoryType(e.target.value as any);
                                setNewCategoryParentId('');
                                setNewLeagueName('');
                              }}
                              className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-dourado text-branco font-semibold"
                            >
                              <option value="club" className="bg-[#0d0d0d]">Clube</option>
                              <option value="league" className="bg-[#0d0d0d]">Liga</option>
                              <option value="national" className="bg-[#0d0d0d]">Seleção / País</option>
                            </select>
                          </div>

                          {newCategoryType === 'club' && (
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-semibold text-cinza-claro block">Liga / Campeonato</label>
                              <select
                                value={newCategoryParentId}
                                onChange={(e) => setNewCategoryParentId(e.target.value)}
                                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-dourado text-branco font-semibold"
                              >
                                <option value="" className="bg-[#0d0d0d]">Sem Liga (Avulso)</option>
                                {categories.filter(c => c.type === 'league').map((l) => (
                                  <option key={l.id} value={l.id} className="bg-[#0d0d0d]">{l.name}</option>
                                ))}
                                <option value="_new_" className="bg-[#0d0d0d] text-dourado font-bold">+ Criar Nova Liga...</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {newCategoryType === 'club' && newCategoryParentId === '_new_' && (
                          <div className="space-y-1 mt-1">
                            <label className="text-[10px] font-semibold text-cinza-claro block">Nome da Nova Liga *</label>
                            <input
                              type="text"
                              placeholder="EX: Brasileiro Série A, Champions League"
                              value={newLeagueName}
                              onChange={(e) => setNewLeagueName(e.target.value)}
                              className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-dourado text-branco font-semibold placeholder-cinza-escuro/50"
                            />
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            disabled={creatingCategory || !newCategoryName.trim()}
                            onClick={async () => {
                              setCreatingCategory(true);
                              try {
                                let finalParentId = newCategoryParentId || null;

                                // 1. Create new league if requested
                                if (newCategoryType === 'club' && newCategoryParentId === '_new_') {
                                  if (!newLeagueName.trim()) {
                                    alert('Por favor, digite o nome da nova liga.');
                                    setCreatingCategory(false);
                                    return;
                                  }

                                  const leagueSlug = newLeagueName.trim()
                                    .toLowerCase()
                                    .replace(/[^a-z0-9\s-]/g, '')
                                    .replace(/\s+/g, '-');

                                  const { data: newLeague, error: leagueErr } = await supabase
                                    .from('categories')
                                    .insert({
                                      name: newLeagueName.trim(),
                                      slug: leagueSlug,
                                      type: 'league',
                                      active: true,
                                      sort_order: categories.length + 1,
                                    })
                                    .select()
                                    .single();

                                  if (leagueErr) throw leagueErr;
                                  if (newLeague) {
                                    categories.push(newLeague as Category);
                                    finalParentId = (newLeague as Category).id;
                                  }
                                }

                                // 2. Create the main category
                                const slug = newCategoryName.trim()
                                  .toLowerCase()
                                  .replace(/[^a-z0-9\s-]/g, '')
                                  .replace(/\s+/g, '-');

                                const { data: newCat, error: catErr } = await supabase
                                  .from('categories')
                                  .insert({
                                    name: newCategoryName.trim(),
                                    slug,
                                    type: newCategoryType,
                                    parent_id: newCategoryType === 'club' ? finalParentId : null,
                                    active: true,
                                    sort_order: categories.length + 1,
                                  })
                                  .select()
                                  .single();

                                if (catErr) throw catErr;
                                if (newCat) {
                                  setCategories([...categories, newCat as Category]);
                                  setCategoryId((newCat as Category).id);
                                  setNewCategoryName('');
                                  setNewCategoryParentId('');
                                  setNewLeagueName('');
                                  setShowNewCategory(false);
                                }
                              } catch (err) {
                                console.error('Erro ao criar categoria:', err);
                                setError('Erro ao criar categoria. Verifique se já não existe.');
                              } finally {
                                setCreatingCategory(false);
                              }
                            }}
                            className="bg-preto text-branco px-4 py-1.5 rounded text-[10px] font-bold tracking-wider border border-dourado hover:bg-verde-medio transition-smooth disabled:opacity-50"
                          >
                            {creatingCategory ? '...' : 'CRIAR'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Temporada *</label>
                    <input
                      type="text"
                      required
                      placeholder="EX: 2024/25"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Tipo de Manto</label>
                    <select
                      value={teamType}
                      onChange={(e) => setTeamType(e.target.value as Product['team_type'] || 'home')}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco font-semibold"
                    >
                      <option value="home" className="bg-[#0d0d0d]">Titular</option>
                      <option value="away" className="bg-[#0d0d0d]">Reserva</option>
                      <option value="third" className="bg-[#0d0d0d]">Alternativo</option>
                      <option value="special" className="bg-[#0d0d0d]">Especial</option>
                    </select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Preço Regular (R$) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={regularPrice || ''}
                      onChange={(e) => setRegularPrice(Number(e.target.value))}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-semibold text-cinza-claro block">Preço Promocional (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                    />
                  </div>
                  <div className="flex items-center space-x-6 h-full pt-4">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-cinza-claro cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => setFeatured(e.target.checked)}
                        className="text-dourado focus:ring-dourado rounded bg-[#161616] border-[#2a2a2a]"
                      />
                      <span>Em Destaque</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-semibold text-cinza-claro cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="text-dourado focus:ring-dourado rounded bg-[#161616] border-[#2a2a2a]"
                      />
                      <span>Ativo</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-cinza-claro block">Descrição Curta</label>
                  <input
                    type="text"
                    placeholder="Descrição rápida para listagem."
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                  />
                </div>
              </div>
              {/* Right Column: Media, variations and sizes */}
              <div className="space-y-6">
                {/* Upload Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-cinza-claro block">Imagem Principal</label>
                  <div className="flex items-center space-x-4">
                    {/* Preview box */}
                    <div className="w-20 h-20 border border-[#2a2a2a] rounded bg-[#131313] flex items-center justify-center overflow-hidden">
                      {mainImage ? (
                        <img src={mainImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="h-6 w-6 text-cinza-claro/20" />
                      )}
                    </div>
                    {/* Upload button wrapper */}
                    <div className="flex-1 space-y-2">
                      <label className="bg-[#161616] hover:bg-[#222] border border-[#2a2a2a] text-branco px-4 py-2 rounded text-xs font-semibold tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-smooth w-full text-center">
                        <Upload className="h-4 w-4 text-dourado" />
                        <span>{uploading ? 'ENVIANDO...' : 'SELECIONAR PRINCIPAL'}</span>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                          aria-label="Selecionar imagem do produto"
                        />
                      </label>
                      {mainImage && !uploading && (
                        <div className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 justify-center bg-emerald-950/20 border border-emerald-900/30 py-1 rounded">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Imagem principal carregada!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banco de Imagens do Bucket */}
                <div className="space-y-2 border-t border-[#262626] pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-cinza-claro block">Acessar Banco de Imagens</label>
                    <button
                      type="button"
                      onClick={() => setShowImageLibrary(true)}
                      className="bg-preto border border-dourado text-dourado hover:bg-dourado hover:text-preto px-4 py-1.5 rounded text-[10px] font-bold tracking-wider transition-smooth"
                    >
                      ABRIR BANCO DE IMAGENS
                    </button>
                  </div>
                </div>

                {/* Imagens de Detalhe (Galeria) */}
                <div className="space-y-2 border-t border-[#262626] pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-cinza-claro block">Galeria de Detalhes</label>
                    <label className="text-dourado hover:text-dourado-claro text-[10px] font-bold cursor-pointer select-none">
                      + SUBIR DETALHES
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        multiple
                        onChange={handleMultipleImagesUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {detailImages.length === 0 ? (
                    <p className="text-[10px] text-cinza-claro/40 font-light py-2 text-center bg-[#131313] rounded border border-dashed border-[#262626]">
                      Nenhuma imagem adicional de detalhe.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1">
                      {detailImages.map((url, idx) => (
                        <div key={idx} className="relative aspect-square border border-[#2a2a2a] rounded overflow-hidden group">
                          <img src={url} alt={`Detalhe ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setDetailImages(detailImages.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-vermelho-alerta/90 text-branco opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            title="Remover imagem"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sizing variations details */}
                <div className="space-y-4 border-t border-[#262626] pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm text-branco tracking-wider uppercase">Estoques por Tamanho</h3>
                    <button
                      type="button"
                      onClick={handleAddVariation}
                      className="text-dourado hover:text-dourado-claro text-xs font-semibold flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>ADICIONAR TAMANHO</span>
                    </button>
                  </div>

                  {variations.length === 0 ? (
                    <p className="text-xxs text-cinza-claro/40 font-light text-center py-4 bg-[#131313] rounded border border-dashed border-[#262626]">
                      Nenhum estoque cadastrado. Adicione pelo menos um tamanho para permitir compras na loja.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {variations.map((v, index) => (
                        <div key={index} className="flex items-center gap-3 bg-[#131313] border border-[#222] p-2 rounded">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                              <label className="text-[10px] font-semibold text-cinza-claro">Tam:</label>
                              <select
                                value={v.size}
                                onChange={(e) => handleVariationChange(index, 'size', e.target.value)}
                                className="border border-[#2a2a2a] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-dourado flex-grow bg-[#161616] text-branco"
                              >
                                {['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Único'].map((size) => (
                                  <option key={size} value={size} className="bg-[#0d0d0d] text-branco">
                                    {size}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label className="text-[10px] font-semibold text-cinza-claro">Qtd:</label>
                              <input
                                type="number"
                                min="0"
                                value={v.stock}
                                onChange={(e) => handleVariationChange(index, 'stock', e.target.value)}
                                className="border border-[#2a2a2a] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-dourado w-full bg-[#161616] text-branco"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariation(index)}
                            className="text-cinza-claro hover:text-vermelho-alerta transition-smooth p-1"
                            aria-label="Excluir tamanho"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description Area */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-cinza-claro block">Descrição Completa</label>
              <textarea
                placeholder="Insira detalhes completos sobre o manto (tecido, lavagem, patchs...)"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-dourado resize-none text-branco placeholder-cinza-escuro/50"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 border-t border-[#262626] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border border-[#333] hover:bg-[#1c1c1c] text-cinza-claro px-6 py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-preto border border-dourado text-branco hover:bg-verde-medio px-8 py-2.5 rounded text-xs font-semibold tracking-wider transition-smooth shadow-md"
              >
                {loading ? 'SALVANDO...' : 'SALVAR PRODUTO'}
              </button>
            </div>
          </form>
        </div>

      {showImageLibrary && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-preto/90 backdrop-blur-xs" onClick={() => setShowImageLibrary(false)}></div>

          {/* Large Modal Content */}
          <div className="relative bg-[#0d0d0d] border border-dourado/30 rounded-lg max-w-5xl w-full p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto flex flex-col text-branco animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cinza-escuro/20 pb-4 mb-4">
              <div className="space-y-1">
                <h3 className="font-heading text-xl tracking-wide text-branco uppercase">Banco de Imagens (Storage)</h3>
                <p className="text-xxs text-cinza-claro/60">Selecione as imagens para o produto principal ou galeria de detalhes</p>
              </div>
              <button
                type="button"
                onClick={() => setShowImageLibrary(false)}
                className="text-cinza-claro hover:text-branco hover:bg-cinza-escuro/40 p-2 rounded-full transition-smooth"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Filtrar por nome de arquivo (ex: spfc, flamengo, real...)"
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-dourado text-branco placeholder-cinza-escuro/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loadingLibrary ? (
              <p className="text-xs text-cinza-claro/40 text-center py-10 animate-pulse">Carregando banco de imagens...</p>
            ) : bucketImages.filter(url => {
              if (!searchQuery.trim()) return true;
              const filename = (url.split('/').pop()?.split('?')[0] || '').toLowerCase();
              return filename.includes(searchQuery.toLowerCase());
            }).length === 0 ? (
              <p className="text-xs text-cinza-claro/40 text-center py-10">Nenhuma imagem encontrada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pr-1">
                {bucketImages
                  .filter(url => {
                    if (!searchQuery.trim()) return true;
                    const filename = (url.split('/').pop()?.split('?')[0] || '').toLowerCase();
                    return filename.includes(searchQuery.toLowerCase());
                  })
                  .map((url, idx) => {
                    const filename = url.split('/').pop()?.split('?')[0] || '';
                    return (
                      <div key={idx} className="relative aspect-square border border-[#2a2a2a] rounded overflow-hidden group bg-[#0d0d0d] flex flex-col justify-end">
                        <img src={url} alt="Banco" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-preto/85 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-2 transition-opacity p-2">
                          <span className="text-[8px] text-cinza-claro text-center break-all truncate max-w-full block mb-1">{filename}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMainImage(url);
                              setShowImageLibrary(false);
                            }}
                            className="w-full bg-dourado text-preto text-[9px] font-bold py-1 rounded shadow hover:bg-dourado-claro transition-smooth"
                          >
                            Usar Principal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!detailImages.includes(url)) {
                                setDetailImages([...detailImages, url]);
                              }
                            }}
                            className="w-full bg-branco text-preto text-[9px] font-bold py-1 rounded shadow hover:bg-cinza-claro transition-smooth"
                          >
                            + Add Detalhe
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
