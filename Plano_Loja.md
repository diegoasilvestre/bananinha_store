# 🏟️ PLANO — Loja de Camisetas de Futebol
> Baseado na arquitetura do Ateliê Magic Dream | Executar no Antigravity

---

## 📋 Visão Geral do Projeto

| Item | Decisão |
|---|---|
| **Nome provisório** | `futebol-store` (renomear conforme a marca) |
| **Stack Frontend** | React 19 + Vite (igual ao projeto atual) |
| **Linguagem** | JavaScript JSX — sem TypeScript |
| **Estilização** | Vanilla CSS com variáveis (igual ao projeto atual) |
| **Banco de Dados** | **Supabase (PostgreSQL)** — free tier superior |
| **Backend / API** | Cloudflare Pages + Cloudflare Functions (serverless) |
| **Hospedagem** | **Cloudflare Pages** — free tier ilimitado |
| **Domínio** | Futuro (comprar e apontar para o Pages) |
| **Pagamento** | Mercado Pago (mesmo do projeto atual) |
| **Frete** | Melhor Envios (mesmo do projeto atual) |
| **WhatsApp Bot** | **Evolution API** (self-hosted grátis) + **n8n** (self-hosted grátis) |
| **Imagens** | **Supabase Storage** (free: 1GB) ou Cloudflare R2 (10GB/mês) |

---

## 🗄️ Fase 1 — Banco de Dados no Supabase

### Por que Supabase é melhor aqui?

O **Supabase free tier** oferece vantagens significativas sobre o Neon:

| Recurso | Supabase Free | Neon Free |
|---|---|---|
| **Storage BD** | 500 MB | 500 MB |
| **Storage Arquivos** | **1 GB** (imagens, assets) | ❌ Não incluso |
| **Auth nativa** | ✅ Completa (email, social, magic link) | ❌ Manual |
| **Realtime** | ✅ WebSockets nativos | ❌ Não incluso |
| **API REST automática** | ✅ PostgREST gerado | ❌ Não incluso |
| **Pausa por inatividade** | Após 7 dias sem acesso | ❌ Nunca pausa |
| **SDK** | `@supabase/supabase-js` completo | `pg` puro |
| **Dashboard** | ✅ Rico (Table Editor, SQL, Logs) | Dashboard básico |

> ⚠️ **Nota sobre pausa**: O Supabase pausa projetos inativos por 7 dias no free tier.
> Para evitar isso: basta fazer uma requisição simples via cron job (ex: UptimeRobot gratuito pings a cada 24h).
> Na prática, uma loja com tráfego orgânico nunca ficará inativa por 7 dias.

### Vantagens práticas para este projeto

- **Supabase Auth** elimina toda a implementação manual de JWT, bcrypt e rotas `/api/auth/*`
- **Supabase Storage** serve as imagens das camisetas com CDN global integrado
- **Supabase Realtime** permite o painel admin ver novos pedidos chegando em tempo real — sem polling
- **PostgREST** reduz drasticamente o número de Cloudflare Functions necessárias (CRUD simples vira chamada de SDK)
- O projeto atual já usa Supabase — reutilizar o conhecimento da equipe

### Schema Limpo (lições aprendidas do Magic Dream)

O maior problema do projeto atual: **tabelas duplicadas em português e inglês** (`cupons` + `coupons`, mistura de idiomas nas colunas). O novo schema será 100% em inglês, sem redundâncias.

```sql
-- ============================================================
-- SCHEMA: loja_camisetas
-- Convenções: snake_case, inglês, UUIDs como PK
-- Execute no SQL Editor do Supabase
-- ============================================================

-- EXTENSÕES (já disponíveis no Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- para busca por texto

-- 1. PROFILES (usuários / clientes — espelho do auth.users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  is_admin    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar profile automaticamente no cadastro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. CATEGORIES (clubes / ligas)
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,       -- ex: "Flamengo", "Premier League"
  slug        TEXT NOT NULL UNIQUE,       -- ex: "flamengo", "premier-league"
  type        TEXT NOT NULL CHECK (type IN ('club', 'league', 'national')),
  image_url   TEXT,
  active      BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS (camisetas)
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  short_desc       TEXT,
  category_id      UUID REFERENCES categories(id),
  season           TEXT,                  -- ex: "2024/25"
  team_type        TEXT CHECK (team_type IN ('home', 'away', 'third', 'goalkeeper', 'special')),
  regular_price    NUMERIC(10,2) NOT NULL,
  sale_price       NUMERIC(10,2),
  main_image       TEXT,                  -- path no Supabase Storage
  images           TEXT[],               -- array de paths no Storage
  weight           NUMERIC(6,3),         -- kg
  height           NUMERIC(6,2),         -- cm
  width            NUMERIC(6,2),         -- cm
  length           NUMERIC(6,2),         -- cm
  featured         BOOLEAN DEFAULT FALSE,
  active           BOOLEAN DEFAULT TRUE,
  views_count      INTEGER DEFAULT 0,    -- ⭐ NOVO: contador de visualizações
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca full-text
CREATE INDEX idx_products_search ON products
  USING GIN (to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));

-- 4. PRODUCT_VARIATIONS (tamanho: PP, P, M, G, GG, XGG)
CREATE TABLE product_variations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        TEXT NOT NULL CHECK (size IN ('PP','P','M','G','GG','XGG','Único')),
  stock       INTEGER NOT NULL DEFAULT 0,
  price_adj   NUMERIC(10,2) DEFAULT 0,   -- ajuste de preço por tamanho
  sku_suffix  TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COUPONS
CREATE TABLE coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   NUMERIC(10,2) NOT NULL,
  min_order_value  NUMERIC(10,2) DEFAULT 0,
  max_uses         INTEGER,
  used_count       INTEGER DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES profiles(id),
  customer_name         TEXT NOT NULL,
  customer_email        TEXT NOT NULL,
  customer_phone        TEXT,
  customer_cpf          TEXT,
  -- Endereço de entrega
  address_zip           TEXT NOT NULL,
  address_street        TEXT NOT NULL,
  address_number        TEXT NOT NULL,
  address_complement    TEXT,
  address_neighborhood  TEXT,
  address_city          TEXT NOT NULL,
  address_state         TEXT NOT NULL,
  -- Valores
  subtotal              NUMERIC(10,2) NOT NULL,
  discount_amount       NUMERIC(10,2) DEFAULT 0,
  shipping_amount       NUMERIC(10,2) DEFAULT 0,
  total_amount          NUMERIC(10,2) NOT NULL,
  -- Pagamento e envio
  payment_method        TEXT,
  payment_id            TEXT,           -- ID externo Mercado Pago
  shipping_method       TEXT,
  tracking_code         TEXT,
  coupon_id             UUID REFERENCES coupons(id),
  -- Status
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  notes                 TEXT,
  -- Metadados WhatsApp Bot
  whatsapp_notified     BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER_ITEMS
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  variation_id    UUID REFERENCES product_variations(id),
  product_name    TEXT NOT NULL,    -- snapshot no momento da compra
  size            TEXT,             -- snapshot
  sku             TEXT,             -- snapshot
  quantity        INTEGER NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL,
  image_url       TEXT,             -- snapshot
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WISHLISTS ⭐ NOVO
CREATE TABLE wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 9. PRICE_ALERTS ⭐ NOVO — alerta de volta ao estoque / queda de preço
CREATE TABLE price_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,           -- pode ser de não-logado
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        TEXT,                    -- tamanho específico (opcional)
  alert_type  TEXT NOT NULL CHECK (alert_type IN ('restock', 'price_drop')),
  notified    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. STORE_SETTINGS (configurações editáveis pelo WhatsApp)
CREATE TABLE store_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT DEFAULT 'admin'  -- 'admin' | 'whatsapp_bot'
);

-- Inserir configurações padrão
INSERT INTO store_settings (key, value, description) VALUES
  ('store_name',        'Sua Loja',           'Nome da loja no header'),
  ('store_tagline',     'As melhores camisetas do Brasil', 'Subtítulo da home'),
  ('hero_title',        'Camisetas Originais', 'Título do banner principal'),
  ('hero_subtitle',     'Encontre a sua',      'Subtítulo do banner principal'),
  ('whatsapp_number',   '5511999999999',        'Número do WhatsApp da loja'),
  ('instagram_url',     '',                     'URL do Instagram'),
  ('free_shipping_min', '299',                  'Valor mínimo para frete grátis'),
  ('announcement_bar',  '',                     'Texto da barra de anúncio (vazio = oculto)'),
  ('quiz_enabled',      'true',                 'Ativar/desativar Quiz do Torcedor'),
  ('size_guide_url',    '',                     'URL da imagem do guia de tamanhos');

-- ============================================================
-- TRIGGERS para updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Supabase usa JWT nativo
-- ============================================================
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts        ENABLE ROW LEVEL SECURITY;

-- Políticas: produtos e categorias públicos
CREATE POLICY "products_public_read"   ON products   FOR SELECT USING (active = TRUE);
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (active = TRUE);
CREATE POLICY "variations_public_read" ON product_variations FOR SELECT USING (active = TRUE);

-- Settings visíveis a todos, editável só por admin
CREATE POLICY "settings_public_read"  ON store_settings FOR SELECT USING (TRUE);
CREATE POLICY "settings_admin_write"  ON store_settings FOR ALL
  USING ((auth.jwt() ->> 'is_admin')::boolean = TRUE);

-- Profiles: usuário vê e edita o próprio
CREATE POLICY "profiles_own"  ON profiles FOR ALL
  USING (auth.uid() = id);

-- Orders: usuário vê os próprios, admin vê tudo
CREATE POLICY "orders_own_read"  ON orders FOR SELECT
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'is_admin')::boolean = TRUE);
CREATE POLICY "orders_own_insert" ON orders FOR INSERT
  WITH CHECK (TRUE);  -- qualquer um pode criar pedido (inclui guest checkout)

-- Wishlist: usuário gerencia a própria
CREATE POLICY "wishlist_own" ON wishlists FOR ALL
  USING (auth.uid() = user_id);

-- Price alerts: qualquer um pode criar, admin vê todos
CREATE POLICY "price_alerts_insert" ON price_alerts FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "price_alerts_admin"  ON price_alerts FOR SELECT
  USING ((auth.jwt() ->> 'is_admin')::boolean = TRUE);
```

---

## 🏗️ Fase 2 — Estrutura do Projeto

```
futebol-store/
├── public/
│   ├── favicon.svg
│   └── images/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── styles/
│   │   ├── variables.css       ← nova paleta (verde/preto/dourado)
│   │   └── animations.css
│   ├── lib/
│   │   ├── supabase.js         ← createClient (@supabase/supabase-js)
│   │   └── storage.js          ← helpers para Supabase Storage (upload/getURL)
│   ├── context/
│   │   ├── AuthContext.jsx     ← usa supabase.auth (sem JWT manual)
│   │   ├── CartContext.jsx
│   │   └── ProductContext.jsx
│   ├── hooks/
│   │   ├── useProducts.js
│   │   ├── useOrders.js
│   │   ├── useWishlist.js      ← ⭐ NOVO
│   │   ├── useRealtime.js      ← ⭐ NOVO — Supabase Realtime para admin
│   │   └── useSettings.js      ← lê store_settings em tempo real
│   ├── components/
│   │   ├── layout/             Layout, Header, Footer, NavMobile
│   │   ├── ui/                 Button, Card, Badge, Modal, Skeleton
│   │   ├── product/            ProductCard, ProductGrid, SizeSelector
│   │   ├── cart/               CartDrawer, CartItem, CartSummary
│   │   ├── quiz/               ← ⭐ NOVO: QuizTorcedor, QuizResult
│   │   └── admin/              ProductModal, OrdersTable, SettingsEditor
│   └── pages/
│       ├── HomePage.jsx
│       ├── ProductsPage.jsx    ← filtros por clube/liga/seleção
│       ├── ProductDetailPage.jsx
│       ├── CartPage.jsx
│       ├── CheckoutPage.jsx
│       ├── OrderSuccessPage.jsx
│       ├── AccountPage.jsx
│       ├── AdminPage.jsx
│       ├── QuizPage.jsx        ← ⭐ NOVO: Quiz do Torcedor
│       ├── LinksPage.jsx       ← bio link para Instagram
│       └── NotFoundPage.jsx
├── functions/
│   └── api/
│       ├── products/           index.js, [sku].js
│       ├── orders/             index.js, webhook-mp.js
│       ├── shipping/           calculate.js
│       ├── coupons/            validate.js
│       ├── settings/           index.js
│       ├── alerts/             notify.js  ← ⭐ NOVO
│       └── whatsapp/
│           └── webhook.js
├── PLANO.md
├── agents_prompts.md
├── CONTEXTO_PROJETO.md
├── .env
├── .dev.vars
├── package.json
└── vite.config.js
```

### Dependências principais

```json
{
  "@supabase/supabase-js": "^2.x",
  "react": "^19.x",
  "react-dom": "^19.x",
  "react-router-dom": "^6.x"
}
```

> Não são necessárias dependências de `pg`, `bcryptjs` ou `jsonwebtoken` — o Supabase Auth resolve tudo.

---

## 🎨 Fase 3 — Identidade Visual

### Nova Paleta (loja de futebol)

```css
:root {
  /* Paleta principal — verde gramado + preto + dourado */
  --verde-escuro:    #1a3a2a;   /* fundo header, botões principais */
  --verde-medio:     #2d6a4f;   /* hovers, destaques */
  --verde-claro:     #d8f3dc;   /* backgrounds suaves */
  --preto:           #0d0d0d;   /* texto principal */
  --cinza-escuro:    #2b2b2b;   /* texto secundário */
  --cinza-claro:     #f5f5f5;   /* backgrounds */
  --dourado:         #c9a84c;   /* preços, badges, estrelas */
  --dourado-claro:   #f0d080;   /* highlights */
  --branco:          #ffffff;
  --vermelho-alerta: #e63946;   /* promoções, badges "NOVO" */

  /* Fontes */
  --font-heading: 'Bebas Neue', sans-serif;  /* impacto — títulos e preços */
  --font-body:    'Inter', sans-serif;        /* legibilidade */

  /* Estrutura */
  --container-width: 1280px;
  --header-height:   68px;
  --radius-sm:       4px;
  --radius-md:       8px;
  --radius-lg:       16px;
}
```

### Componentes visuais chave

- **Banner hero** com imagem de camiseta em destaque + CTA
- **Grid de clubes** (logos + nome) como filtro visual na home
- **Card de produto** com badge de temporada (ex: "2024/25"), tamanhos disponíveis em pills
- **Announcement bar** no topo — editável via WhatsApp
- **Drawer de carrinho** lateral (mobile-first)
- **Página de detalhe** com galeria de imagens, seletor de tamanho e botão de frete

---

## 📱 Fase 4 — Bot WhatsApp (grátis, self-hosted)

### Stack do Bot

| Componente | Ferramenta | Custo |
|---|---|---|
| **WhatsApp API** | Evolution API (open-source) | Grátis |
| **Orquestração** | n8n (self-hosted no Railway free tier) | Grátis |
| **Hospedagem** | Railway.app (free tier) | Grátis |
| **Webhook receptor** | Cloudflare Function (`/api/whatsapp/webhook`) | Grátis |

### Comandos disponíveis no WhatsApp

O dono da loja envia mensagens para o próprio número cadastrado:

```
📦 PRODUTOS
/produtos                     → lista todos os produtos ativos
/produto novo [nome] [preço]  → adiciona produto rascunho
/estoque PP [sku] [qtd]       → atualiza estoque de um tamanho

🏷️ TEXTOS (edita store_settings)
/banner [novo texto]          → muda o announcement bar
/hero [título] | [subtítulo]  → muda o hero da home
/frete gratis [valor]         → muda o mínimo para frete grátis

📊 RELATÓRIOS
/pedidos hoje                 → pedidos do dia
/pedidos pendentes            → pedidos aguardando envio
/faturamento mes              → faturamento do mês atual

🚚 PEDIDOS
/rastrear [código_pedido]     → status do pedido
/enviar [código_pedido] [código_rastreio] → marca como enviado

🔔 NOTIFICAÇÕES AUTOMÁTICAS (sem comando)
→ Bot avisa automaticamente quando chega pedido novo
→ Bot avisa quando estoque de um tamanho chega a zero
→ Bot avisa quando há alertas de restock pendentes ⭐ NOVO
```

### Fluxo Técnico do Bot

```
WhatsApp (seu número)
    ↓ mensagem
Evolution API (Railway)
    ↓ webhook POST
n8n workflow
    ↓ interpreta comando
Cloudflare Function /api/whatsapp/webhook
    ↓ executa via Supabase SDK (não pg direto)
Resposta volta pelo n8n → Evolution API → WhatsApp
```

---

## ☁️ Fase 5 — Deploy (100% Free Tier)

### Cloudflare Pages

```bash
# Build settings no Cloudflare Pages
Build command:   npm run build
Build output:    dist
Root directory:  /
Node version:    20
```

### Variáveis de Ambiente (Cloudflare Pages → Settings → Variables)

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...          ← chave pública (segura para o frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← chave secreta (apenas nas Functions)

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_PUBLIC_KEY=APP_USR-...
MP_WEBHOOK_SECRET=...

# Melhor Envios
MELHOR_ENVIO_TOKEN=eyJ...
VITE_ORIGIN_CEP=seu_cep_de_origem

# WhatsApp Bot
WHATSAPP_BOT_NUMBER=5511999999999
WHATSAPP_SECRET=token_secreto_webhook

# Frontend (expostos ao browser — sem secrets)
VITE_APP_URL=https://seu-projeto.pages.dev
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MP_PUBLIC_KEY=APP_USR-...
```

### Supabase — Setup

1. Criar conta em **supabase.com**
2. Criar projeto → escolher região **South America (São Paulo)**
3. Copiar `SUPABASE_URL` e as chaves em **Project Settings → API**
4. Rodar o SQL do schema (Fase 1) no **SQL Editor**
5. Criar bucket `products` no **Storage** (público) para imagens das camisetas
6. Ativar **UptimeRobot** (gratuito) para pingar o projeto a cada 24h e evitar pausa

---

## 🤖 Fase 6 — Subagentes Antigravity

| Agente | Responsabilidade |
|---|---|
| `agent_pm` | Planejamento, priorização, roadmap |
| `agent_fullstack` | React, Cloudflare Functions, Supabase SDK |
| `agent_reviewer` | Code review, segurança, RLS policies, performance |
| `agent_docs` | CONTEXTO_PROJETO.md, README, comentários |
| `agent_devops` | Deploy, variáveis de ambiente, Supabase migrations |
| `agent_whatsapp` | *(novo)* Flows do n8n, comandos do bot, Evolution API |

---

## ⭐ Fase 7 — Diferenciais Exclusivos

Esta fase contém as funcionalidades que vão separar sua loja de qualquer concorrente genérico.

---

### 7.1 🧠 Quiz "Qual camiseta combina com você?"

**O diferencial mais viral da loja.** Em vez de o cliente ficar perdido navegando por dezenas de camisetas, um quiz interativo de 4-5 perguntas gera uma recomendação personalizada.

**Perguntas sugeridas:**
1. Qual é o seu time do coração? *(dropdown com todos os clubes)*
2. Você prefere o uniforme 1 (casa) ou 2 (fora)?
3. Qual temporada você curte mais? *(atual / retrô clássico)*
4. Você prioriza: estilo na rua ou para jogar?
5. Qual é a sua faixa de preço?

**Como funciona:**
- As respostas são filtros que consultam a tabela `products` via Supabase
- O resultado mostra as top 3 camisetas recomendadas com CTA direto para compra
- Botão de compartilhamento: *"Minha camiseta ideal é essa! Descubra a sua 👉 [link]"* — geração orgânica de tráfego no Instagram

**Implementação:** página `/quiz` com componente de wizard em etapas. Sem banco necessário (apenas consulta de produtos).

---

### 7.2 🔔 Alerta de Volta ao Estoque / Queda de Preço

**Converte visitantes que foram embora sem comprar.** Quando um tamanho está esgotado, em vez de perder o cliente, a página exibe:

> *"Tamanho G esgotado. Avise-me quando voltar →"* (campo de e-mail)

O e-mail é salvo na tabela `price_alerts`. Quando o admin atualiza o estoque via WhatsApp ou pelo painel, a Function `/api/alerts/notify` dispara um e-mail via **Resend** (free tier: 3.000 e-mails/mês) para todos os interessados.

**Também funciona para queda de preço:** se o produto entrar em promoção, os interessados são notificados automaticamente.

**Retorno esperado:** recuperar 10-20% dos visitantes que saíram sem comprar.

---

### 7.3 🪄 Montador de Uniforme (Look Completo)

**Aumenta o ticket médio.** Na página de um produto, além da camiseta, o sistema exibe:
> *"Monte o look completo"*

Mostrando sugestões de produtos complementares do mesmo clube (short, meias, moletom, etc.) com um botão *"Adicionar tudo ao carrinho"*.

Implementado como uma consulta simples: `SELECT * FROM products WHERE category_id = ? AND id != ? LIMIT 4`

**Impacto:** eleva o ticket médio naturalmente, sem parecer spam.

---

### 7.4 📅 Pré-venda com Countdown

**Gera hype para lançamentos.** Quando uma camiseta nova ainda não chegou ao estoque, em vez de não mostrar nada, a loja exibe o produto com:
- Foto (quando disponível) ou imagem de silhueta misteriosa com o escudo do clube
- Timer de contagem regressiva até a data de lançamento
- Botão *"Quero ser avisado"* (salva na tabela `price_alerts` com `alert_type = 'restock'`)

**Adicionar ao schema:** coluna `available_at TIMESTAMPTZ` na tabela `products`. Se `available_at > NOW()`, o produto entra em modo pré-venda.

---

### 7.5 🎨 Visualizador de Número/Nome na Camiseta *(futuro — Sprint 7)*

**O diferencial mais técnico.** Uma camiseta personalizada com nome e número é um produto de alto valor. Na página de detalhe, um preview interativo permite o cliente digitar o nome e número e ver como ficará na camiseta antes de comprar.

**Implementação simplificada:** um `<canvas>` com a imagem da camiseta como fundo e texto posicionado na área do dorso. Não requer servidor — tudo no cliente.

**Requer:** produtos com flag `is_customizable = TRUE` e a posição/estilo do texto configurável por produto.

---

### 7.6 📦 Rastreamento de Pedido Público (sem login)

**Reduz suporte no WhatsApp.** Uma página `/rastrear` onde o cliente digita apenas o e-mail + CPF (ou o código do pedido) e vê o status atual com linha do tempo visual:

```
✅ Pedido recebido → ✅ Pagamento confirmado → 🔄 Em preparação → 📦 Enviado → 🏠 Entregue
```

Quando `tracking_code` está preenchido, um link direto para o site dos Correios/transportadora é exibido.

**Impacto:** clientes param de perguntar *"cadê meu pedido?"* no WhatsApp.

---

## 🗓️ Ordem de Execução (Sprints)

### Sprint 1 — Fundação (1-2 dias)
- [x] Criar conta Supabase + rodar schema (Supabase OK)
- [x] Criar bucket `products` no Supabase Storage
- [/] Criar projeto no GitHub (Falta realizar o commit local)
- [x] Scaffold do projeto React 19 + Vite
- [ ] Configurar Cloudflare Pages + conectar GitHub
- [x] Criar `variables.css` com a nova paleta
- [x] `lib/supabase.js` — `createClient` configurado
- [x] `lib/storage.js` — helpers para upload e URL pública

### Sprint 2 — Vitrine (2-3 dias)
- [x] Header responsivo com busca + carrinho
- [x] HomePage com hero + grid de clubes + produtos em destaque
- [x] ProductsPage com filtros (clube, liga, seleção, temporada)
- [x] ProductDetailPage com galeria + seletor de tamanho + frete + **botão de alerta de estoque**
- [x] CartDrawer lateral
- [x] Footer

### Sprint 3 — Checkout (2 dias)
- [/] CheckoutPage (endereço + frete simulado; integração real Melhor Envios pendente)
- [ ] Integração Mercado Pago (Checkout Pro ou Transparente)
- [ ] Webhook de pagamento (`/api/orders/webhook-mp`)
- [x] OrderSuccessPage
- [x] Sistema de cupons

### Sprint 4 — Admin (1-2 dias)
- [x] AdminPage (produtos, pedidos, clientes, configurações)
- [x] Painel de pedidos com **atualização em Realtime** (Supabase Realtime)
- [x] ProductModal (criar/editar produto + upload de imagem para Supabase Storage)
- [x] SettingsEditor (editar store_settings pela UI)

### Sprint 5 — WhatsApp Bot (2-3 dias)
- [ ] Setup Evolution API no Railway
- [ ] Workflows n8n para cada comando
- [x] Cloudflare Function `/api/whatsapp/webhook`
- [x] Notificação automática de pedido novo
- [x] Alerta de estoque zerado + notificação de alertas pendentes

### Sprint 6 — Diferenciais (2-3 dias)
- [x] **Quiz do Torcedor** — página + wizard + resultado
- [x] **Alerta de estoque/preço** — tabela + UI + e-mail via Resend
- [x] **Rastreamento público** — página `/rastrear`
- [x] **Pré-venda countdown** — coluna `available_at` + timer
- [x] **Montador de look** — seção de complementos na página do produto

### Sprint 7 — Polimento
- [x] SEO (meta tags, sitemap, robots.txt)
- [x] Performance (lazy load imagens via Supabase Storage CDN, code splitting)
- [x] PWA básico (manifest + service worker)
- [ ] Testes nos principais fluxos
- [ ] Domínio apontado para o Pages
- [x] Visualizador de nome/número *(se viável)*

---

## ⚠️ Limites do Free Tier — Monitorar

| Serviço | Limite Grátis | Ação se atingir |
|---|---|---|
| **Supabase BD** | 500 MB | Limpar dados antigos / upgrade $25/mês |
| **Supabase Storage** | 1 GB | Migrar imagens para Cloudflare R2 |
| **Supabase Auth** | 50.000 MAU | Excelente — só migrar com tráfego alto |
| **Supabase Realtime** | 200 conexões simultâneas | Suficiente para o painel admin |
| **Supabase Pausa** | 7 dias de inatividade | UptimeRobot ping gratuito resolve |
| **Cloudflare Pages** | Ilimitado | — |
| **Cloudflare Functions** | 100k req/dia | Migrar para Workers pagos (~$5/mês) |
| **Railway (n8n)** | $5 crédito/mês grátis | Migrar para VPS $3/mês se necessário |
| **Resend (e-mails)** | 3.000/mês grátis | Mais que suficiente no início |
| **Mercado Pago** | Taxa por transação | Custo de negócio, inevitável |

---

## 🔐 Autenticação com Supabase Auth

Usando o Supabase Auth nativo — zero implementação manual de JWT, rotas de login ou hash de senha.

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// AuthContext.jsx — tudo em ~20 linhas
const { data: { user } } = await supabase.auth.getUser()
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signUp({ email, password, options: { data: { full_name } } })
await supabase.auth.signOut()

// Magic Link (login sem senha — ótimo para mobile)
await supabase.auth.signInWithOtp({ email })
```

**Fluxos disponíveis sem código extra:**
- Email + senha
- Magic Link (link no e-mail, sem senha)
- Google / Facebook OAuth (2 cliques para ativar no dashboard)
- Recuperação de senha automática

**Nas Cloudflare Functions** (operações admin):
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY  // bypassa RLS — usar só no servidor
)
```

---

## 📝 Próximos Passos Imediatos

1. **Você** → Criar conta no Supabase (supabase.com) e me passar a `SUPABASE_URL` e as chaves
2. **Você** → Definir o nome da loja e enviar as imagens das camisetas
3. **Você** → Criar repositório no GitHub
4. **Eu** → Gero o scaffold completo do projeto com toda a estrutura acima
5. **Você** → Conecta o GitHub ao Cloudflare Pages
6. **Eu** → Gero o schema SQL completo para rodar no Supabase
7. **Eu** → Começo o desenvolvimento por Sprint

---

*Plano revisado em: 25/05/2026 | Versão: 2.0*
*Mudança principal: Neon → Supabase (auth nativa, storage, realtime)*
*Novidades: Quiz do Torcedor, Alerta de Estoque, Rastreamento Público, Pré-venda Countdown, Montador de Look*
*Referência: Ateliê Magic Dream React (análise completa da arquitetura existente)*
