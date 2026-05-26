import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'club' | 'league' | 'national';
  parent_id?: string;
  image_url?: string;
  active: boolean;
  sort_order: number;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  size: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG' | 'Único';
  stock: number;
  price_adj: number;
  sku_suffix?: string;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  short_desc?: string;
  category_id?: string;
  season?: string;
  team_type?: 'home' | 'away' | 'third' | 'goalkeeper' | 'special';
  regular_price: number;
  sale_price?: number;
  main_image?: string;
  images?: string[];
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  featured: boolean;
  active: boolean;
  views_count: number;
  created_at: string;
  available_at?: string;
  variations?: ProductVariation[];
  category?: Category;
}

export function useProducts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCategories = useCallback(async (): Promise<Category[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (err) throw err;
      return (data || []) as Category[];
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load categories';
      setError(errMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getProducts = useCallback(async (filters?: {
    categoryId?: string | string[];
    teamType?: string;
    featured?: boolean;
    search?: string;
  }): Promise<Product[]> => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('active', true);

      if (filters?.categoryId) {
        if (Array.isArray(filters.categoryId)) {
          query = query.in('category_id', filters.categoryId);
        } else {
          query = query.eq('category_id', filters.categoryId);
        }
      }
      if (filters?.teamType) {
        query = query.eq('team_type', filters.teamType);
      }
      if (filters?.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }

      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) throw err;
      let results = (data || []) as Product[];

      // In-memory simple search if search parameter is present and DB index isn't used
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower) ||
            p.sku.toLowerCase().includes(searchLower)
        );
      }

      return results;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load products';
      setError(errMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductBySlug = useCallback(async (slug: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch product
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (prodErr) throw prodErr;
      if (!prodData) return null;

      const product = prodData as Product;

      // 2. Fetch variations
      const { data: varData, error: varErr } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', product.id)
        .eq('active', true);

      if (varErr) throw varErr;

      product.variations = (varData || []) as ProductVariation[];

      // Incremental view count asynchronously
      supabase.rpc('increment_views', { product_id: product.id }).then((res) => {
        const rpcErr = res.error;
        if (rpcErr) {
          // Fallback to manual update if RPC is not deployed yet
          supabase
            .from('products')
            .update({ views_count: (product.views_count || 0) + 1 })
            .eq('id', product.id)
            .then(() => {});
        }
      });

      return product;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load product detail';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRelatedProducts = useCallback(async (categoryId: string, excludeProductId: string, limit = 4): Promise<Product[]> => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .neq('id', excludeProductId)
        .eq('active', true)
        .limit(limit);

      if (err) throw err;
      return (data || []) as Product[];
    } catch (err: unknown) {
      console.error('Failed to load related products:', err);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    getCategories,
    getProducts,
    getProductBySlug,
    getRelatedProducts,
  };
}
