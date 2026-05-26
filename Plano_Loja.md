# Prompt — Melhorias e Novas Funcionalidades | bananinha_store

> Enviar para: agent_pm → agent_fullstack → agent_reviewer

---

## Contexto

Projeto: `bananinha_store` — e-commerce de camisetas de futebol
Stack: React 19 + Vite, JavaScript JSX, Vanilla CSS, Supabase (PostgreSQL + Storage + Auth + Realtime), Cloudflare Pages + Functions.
Repositório: <https://github.com/diegoasilvestre/bananinha_store>
Sprints 1–6 concluídos conforme `Plano_Loja.md`. O site está funcional e entrando em fase de catálogo e vendas.

---

## Missão

Implementar as melhorias abaixo em ordem de prioridade. Para cada item:

1. O `agent_pm` define a tarefa com critérios de aceite
2. O `agent_fullstack` implementa
3. O `agent_reviewer` audita antes de qualquer merge

Nenhuma alteração deve quebrar funcionalidades existentes. Validar com o usuário antes de cada sprint.

---

## Prioridade 1 — Conversão e Vendas (impacto imediato)

### 1.1 Busca inteligente com filtros combinados

A `ProductsPage` já tem filtros básicos. Evoluir para:

- Busca full-text usando o índice `idx_products_search` já criado no Supabase (`pg_trgm`)
- Filtros combinados: clube + temporada + tipo (home/away/third) + faixa de preço
- URL sincronizada com os filtros ativos (query params) para compartilhamento e SEO
- Skeleton loading durante fetch

Acceptance criteria:

- [ ] Busca retorna resultados em < 300ms para catálogo de até 500 produtos
- [ ] Filtros combinados funcionam sem recarregar a página
- [ ] URL reflete o estado dos filtros ativos
- [ ] Zero regressão nos filtros existentes

---

### 1.2 Carrinho persistente (localStorage + Supabase para usuários logados)

Hoje o carrinho some ao fechar a aba.

- Usuário não logado: persistir no `localStorage`
- Usuário logado: sincronizar com tabela `cart_items` no Supabase (criar tabela simples)
- Ao fazer login, mesclar o carrinho local com o da conta

Acceptance criteria:

- [ ] Carrinho sobrevive a F5 e fechamento da aba
- [ ] Usuário logado vê o mesmo carrinho em dispositivos diferentes
- [ ] Merge correto ao logar com itens no carrinho local

---

### 1.3 Página de produto — galeria de imagens aprimorada

O campo `images TEXT[]` já existe na tabela `products` mas a galeria não usa múltiplas fotos.

- Galeria com thumbnail strip na lateral/abaixo
- Zoom ao hover no desktop
- Swipe no mobile (sem biblioteca externa — CSS scroll snap)
- Imagem principal muda ao clicar na thumbnail

Acceptance criteria:

- [ ] Suporte a até 6 imagens por produto
- [ ] Swipe funciona em iOS e Android
- [ ] Sem dependência de biblioteca de carrossel
- [ ] LCP (Largest Contentful Paint) da imagem principal ≤ 2.5s

---

## Prioridade 2 — Experiência do Cliente

### 2.1 Sistema de tamanhos com guia visual

O `SizeSelector` existe mas não tem guia de medidas.

- Modal de guia de tamanhos acionado por link "Ver guia de tamanhos"
- Tabela de medidas: PP/P/M/G/GG/XGG com busto, comprimento, manga
- Configurável pelo admin via `store_settings` (chave `size_guide_url` já existe)
- Pills de tamanho mostram visualmente quais estão esgotados (riscados, não clicáveis)

Acceptance criteria:

- [ ] Modal abre sem recarregar página
- [ ] Tamanhos esgotados (stock = 0) aparecem desabilitados
- [ ] Admin pode atualizar guia sem deploy

---

### 2.2 Página de rastreamento público `/rastrear`

Já planejada no Sprint 6 — implementar conforme especificação do `Plano_Loja.md`:

- Input: e-mail + código do pedido (sem login)
- Timeline visual de status: Recebido → Pago → Em preparação → Enviado → Entregue
- Link direto para Correios quando `tracking_code` estiver preenchido
- RLS: consulta via Cloudflare Function com Service Role (não expor dados sensíveis)

Acceptance criteria:

- [ ] Funciona para guest checkout (sem conta)
- [ ] Não expõe CPF, endereço completo ou dados de pagamento
- [ ] Link dos Correios abre em nova aba
- [ ] Página indexável pelo Google (SSR ou meta tags corretas)

---

### 2.3 E-mail transacional com Resend

Hoje os pedidos não enviam confirmação por e-mail.

- Instalar e configurar `Resend` (já mencionado no plano, 3k e-mails/mês grátis)
- Templates em React Email para: confirmação de pedido, pedido enviado (com código de rastreio), alerta de volta ao estoque
- Disparado via Cloudflare Function após webhook do Mercado Pago confirmar pagamento

Acceptance criteria:

- [ ] E-mail de confirmação chega em < 30s após pagamento confirmado
- [ ] Template responsivo, testado em Gmail e Apple Mail
- [ ] Nenhuma chave do Resend exposta no frontend

---

## Prioridade 3 — Admin e Operação

### 3.1 Upload de imagens direto no ProductModal

Hoje o admin precisa subir imagens separadamente no Supabase Storage.

- Drag & drop de múltiplas imagens dentro do `ProductModal`
- Compressão client-side antes do upload (canvas API, sem biblioteca)
- Preview das imagens antes de salvar
- Reordenação por drag & drop para definir qual é a `main_image`
- Delete individual de imagem com confirmação

Acceptance criteria:

- [ ] Upload de até 6 imagens por produto
- [ ] Compressão automática para ≤ 200KB por imagem antes do upload
- [ ] Ordem salva corretamente no campo `images TEXT[]`
- [ ] Imagens deletadas são removidas do Storage (não apenas do registro)

---

### 3.2 Dashboard de métricas no painel admin

A `AdminPage` tem gestão de produtos e pedidos mas sem visão de negócio.

- Cards de resumo: faturamento do mês, pedidos hoje, ticket médio, produtos mais vendidos
- Dados vindos de queries agregadas no Supabase (sem biblioteca de BI externa)
- Gráfico simples de pedidos por dia nos últimos 30 dias (SVG puro ou recharts se já instalado)
- Atualização em tempo real via Supabase Realtime (já configurado para pedidos)

Acceptance criteria:

- [ ] Dashboard carrega em < 1s com dados reais
- [ ] Novos pedidos atualizam os cards sem F5
- [ ] Visível apenas para `is_admin = true`
- [ ] Mobile-friendly (cards em coluna única no celular)

---

## Prioridade 4 — SEO e Performance

### 4.1 Meta tags dinâmicas por produto

- `<title>`, `<meta description>`, Open Graph e Twitter Card por produto
- Canonical URL em todas as páginas
- Schema.org `Product` markup (JSON-LD) nas páginas de produto para Rich Results do Google
- Sitemap.xml gerado automaticamente a partir dos produtos ativos no Supabase

Acceptance criteria:

- [ ] Google Rich Results Test aprova o markup de produto
- [ ] OG tags corretas ao compartilhar no WhatsApp e Instagram
- [ ] Sitemap atualiza automaticamente quando produto é adicionado/removido

---

### 4.2 Lazy loading e otimização de imagens

- `loading="lazy"` em todas as imagens de listagem
- `srcset` com versões 400w, 800w, 1200w (URLs do Supabase Storage com transform)
- Skeleton placeholder enquanto imagem carrega
- Preload da imagem principal na página de produto

Acceptance criteria:

- [ ] Lighthouse Performance ≥ 85 em mobile
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Imagens de listagem nunca excedem 80KB

---

## Observações Técnicas

- Manter 100% JavaScript JSX — sem migrar para TypeScript neste ciclo
- Nenhuma nova dependência sem aprovação explícita do usuário
- Todo segredo novo deve ir para `.env.example` com valor placeholder
- RLS do Supabase deve ser revisada a cada nova tabela criada
- Cloudflare Functions para qualquer operação que use `SUPABASE_SERVICE_ROLE_KEY`

---

*Prompt gerado em: 26/05/2026*
*Baseado em: Plano_Loja.md v2.0 + agents_prompts.md*
