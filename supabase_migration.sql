-- Script de Migração para criar a tabela cart_items no Supabase
-- Copie e cole este código no editor SQL do painel do seu Supabase (https://supabase.com)

-- Criar tabela de itens do carrinho
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  custom_name TEXT,
  custom_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar erros de duplicidade
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can select their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

-- Criar Políticas de RLS
CREATE POLICY "Users can insert their own cart items" 
  ON public.cart_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own cart items" 
  ON public.cart_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" 
  ON public.cart_items FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" 
  ON public.cart_items FOR DELETE 
  USING (auth.uid() = user_id);
