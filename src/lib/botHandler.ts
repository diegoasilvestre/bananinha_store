import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to slugify product names
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // separate accent from letter
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric, spaces, hyphens
    .replace(/[\s_-]+/g, '-') // swap spaces and underscores to hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens
}

export async function handleBotCommand(
  messageText: string,
  _senderPhone: string,
  supabase: SupabaseClient
): Promise<string> {
  const cleanMessage = messageText.trim();
  const commandPart = cleanMessage.split(' ')[0].toLowerCase();

  try {
    switch (commandPart) {
      case '/produtos': {
        const { data: products, error } = await supabase
          .from('products')
          .select('name, sku, regular_price, active')
          .order('name', { ascending: true });

        if (error) throw error;
        if (!products || products.length === 0) {
          return '📦 Nenhum produto cadastrado no banco de dados.';
        }

        let response = '👕 *Lista de Produtos na Loja:*\n\n';
        products.forEach((p) => {
          const status = p.active ? '✅ Ativo' : '⚪ Rascunho';
          response += `• *${p.name}*\n  SKU: \`${p.sku}\` | Preço: R$ ${Number(p.regular_price).toFixed(2)} | [${status}]\n\n`;
        });
        return response.trim();
      }

      case '/produto': {
        // Expected: /produto novo [nome] [preço]
        // Example: /produto novo Camisa Flamengo Retro 199.90
        const match = cleanMessage.match(/^\/produto\s+novo\s+(.+)\s+(\d+(?:\.\d{1,2})?)$/i);
        if (!match) {
          return '❌ Formato inválido. Use:\n`/produto novo [Nome do Produto] [Preço]`\n\nExemplo:\n`/produto novo Camisa Retro Flamengo 189.90`';
        }

        const name = match[1].trim();
        const price = parseFloat(match[2]);
        const sku = `CAM-${Date.now().toString().slice(-6)}`;
        const slug = `${slugify(name)}-${Date.now().toString().slice(-4)}`;

        const { data, error } = await supabase
          .from('products')
          .insert({
            name,
            sku,
            slug,
            regular_price: price,
            active: false, // Created as draft/inactive
            team_type: 'home',
            description: 'Produto criado via WhatsApp Bot.'
          })
          .select()
          .single();

        if (error) throw error;

        return `✅ *Produto Criado com Sucesso (Rascunho):*\n\n• *Nome:* ${data.name}\n• *SKU:* \`${data.sku}\`\n• *Preço:* R$ ${price.toFixed(2)}\n\n_Para ativar e adicionar estoque/imagens, utilize o Painel Admin da loja._`;
      }

      case '/estoque': {
        // Expected: /estoque [tamanho] [sku] [qtd]
        // Example: /estoque G CAM-123456 15
        const match = cleanMessage.match(/^\/estoque\s+(\S+)\s+(\S+)\s+(\d+)$/i);
        if (!match) {
          return '❌ Formato inválido. Use:\n`/estoque [Tamanho] [SKU] [Quantidade]`\n\nExemplo:\n`/estoque G CAM-123456 25`';
        }

        const sizeInput = match[1].toUpperCase();
        const sku = match[2];
        const qty = parseInt(match[3], 10);

        const validSizes = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'ÚNICO'];
        if (!validSizes.includes(sizeInput)) {
          return `❌ Tamanho inválido. Os tamanhos aceitos são: ${validSizes.join(', ')}`;
        }

        // Find product
        const { data: product, error: prodErr } = await supabase
          .from('products')
          .select('id, name')
          .eq('sku', sku)
          .single();

        if (prodErr || !product) {
          return `❌ Produto com SKU \`${sku}\` não foi encontrado.`;
        }

        // Check if variation already exists
        const { data: variation } = await supabase
          .from('product_variations')
          .select('id')
          .eq('product_id', product.id)
          .eq('size', sizeInput)
          .maybeSingle();

        if (variation) {
          // Update
          const { error: updErr } = await supabase
            .from('product_variations')
            .update({ stock: qty })
            .eq('id', variation.id);

          if (updErr) throw updErr;
        } else {
          // Create
          const { error: insErr } = await supabase
            .from('product_variations')
            .insert({
              product_id: product.id,
              size: sizeInput,
              stock: qty,
              sku_suffix: sizeInput
            });

          if (insErr) throw insErr;
        }

        return `📦 *Estoque Atualizado:* \n\n• *Produto:* ${product.name}\n• *SKU:* \`${sku}\`\n• *Tamanho:* ${sizeInput}\n• *Nova Quantidade:* ${qty} unidades`;
      }

      case '/banner': {
        const text = cleanMessage.replace(/^\/banner\s*/i, '').trim();
        
        const { error } = await supabase
          .from('store_settings')
          .update({ value: text, updated_at: new Date().toISOString(), updated_by: 'whatsapp_bot' })
          .eq('key', 'announcement_bar');

        if (error) throw error;

        return text 
          ? `📢 *Barra de Anúncio Atualizada:*\n"${text}"`
          : '📢 *Barra de Anúncio Ocultada* (texto limpo).';
      }

      case '/hero': {
        const text = cleanMessage.replace(/^\/hero\s*/i, '').trim();
        const parts = text.split('|');
        if (parts.length < 2) {
          return '❌ Formato inválido. Use:\n`/hero [Título] | [Subtítulo]`\n\nExemplo:\n`/hero Super Oferta de Mantos | Frete grátis em todo o site`';
        }

        const title = parts[0].trim();
        const subtitle = parts[1].trim();

        const { error: err1 } = await supabase
          .from('store_settings')
          .update({ value: title, updated_at: new Date().toISOString(), updated_by: 'whatsapp_bot' })
          .eq('key', 'hero_title');

        const { error: err2 } = await supabase
          .from('store_settings')
          .update({ value: subtitle, updated_at: new Date().toISOString(), updated_by: 'whatsapp_bot' })
          .eq('key', 'hero_subtitle');

        if (err1 || err2) throw (err1 || err2);

        return `🎨 *Hero da Home Page Atualizado:*\n\n• *Título:* ${title}\n• *Subtítulo:* ${subtitle}`;
      }

      case '/frete': {
        const match = cleanMessage.match(/^\/frete\s+gratis\s+(\d+)$/i);
        if (!match) {
          return '❌ Formato inválido. Use:\n`/frete gratis [Valor Mínimo]`\n\nExemplo:\n`/frete gratis 299`';
        }

        const value = match[1];

        const { error } = await supabase
          .from('store_settings')
          .update({ value, updated_at: new Date().toISOString(), updated_by: 'whatsapp_bot' })
          .eq('key', 'free_shipping_min');

        if (error) throw error;

        return `🚚 *Valor de Frete Grátis Mínimo Atualizado:* R$ ${parseFloat(value).toFixed(2)}`;
      }

      case '/pedidos': {
        const type = cleanMessage.split(' ')[1]?.toLowerCase();

        if (type === 'hoje') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const { data: orders, error } = await supabase
            .from('orders')
            .select('id, customer_name, total_amount, status')
            .gte('created_at', startOfToday.toISOString())
            .order('created_at', { ascending: false });

          if (error) throw error;
          if (!orders || orders.length === 0) {
            return '📊 *Relatório de Hoje:* Nenhum pedido recebido hoje até o momento.';
          }

          let response = `📊 *Pedidos de Hoje (${orders.length}):*\n\n`;
          let totalHoy = 0;
          orders.forEach((o) => {
            totalHoy += Number(o.total_amount);
            response += `• ID: \`${o.id.slice(0, 8)}\` | ${o.customer_name} | R$ ${Number(o.total_amount).toFixed(2)} [${o.status}]\n`;
          });
          response += `\n*Faturamento Estimado:* R$ ${totalHoy.toFixed(2)}`;
          return response;
        }

        if (type === 'pendentes') {
          const { data: orders, error } = await supabase
            .from('orders')
            .select('id, customer_name, total_amount, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

          if (error) throw error;
          if (!orders || orders.length === 0) {
            return '✅ *Pedidos Pendentes:* Não há nenhum pedido aguardando pagamento no momento.';
          }

          let response = `⏳ *Pedidos Pendentes de Pagamento (${orders.length}):*\n\n`;
          orders.forEach((o) => {
            const date = new Date(o.created_at).toLocaleDateString('pt-BR');
            response += `• ID: \`${o.id.slice(0, 8)}\` | ${o.customer_name} | R$ ${Number(o.total_amount).toFixed(2)} | feito em ${date}\n`;
          });
          return response;
        }

        return '❌ Comando inválido. Use `/pedidos hoje` ou `/pedidos pendentes`.';
      }

      case '/faturamento': {
        const type = cleanMessage.split(' ')[1]?.toLowerCase();
        if (type !== 'mes') {
          return '❌ Comando inválido. Use `/faturamento mes`.';
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: orders, error } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', startOfMonth.toISOString())
          .in('status', ['paid', 'processing', 'shipped', 'delivered']);

        if (error) throw error;

        const totalMonth = (orders || []).reduce((sum, o) => sum + Number(o.total_amount), 0);

        return `💰 *Faturamento do Mês Atual:*\n\n• *Período:* Desde ${startOfMonth.toLocaleDateString('pt-BR')}\n• *Pedidos Pagos/Enviados:* ${orders?.length || 0}\n• *Total Faturado:* R$ ${totalMonth.toFixed(2)}`;
      }

      case '/rastrear': {
        const orderIdInput = cleanMessage.replace(/^\/rastrear\s*/i, '').trim();
        if (!orderIdInput) {
          return '❌ Por favor, digite o ID do pedido. Exemplo:\n`/rastrear [código_pedido]`';
        }

        // Try exact match or partial match on UUID
        let query = supabase.from('orders').select('*');
        
        // UUID format validation
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderIdInput);
        
        if (isUUID) {
          query = query.eq('id', orderIdInput);
        } else {
          // Fallback to fetch recent and filter in-memory if input is partial
          const { data: recentOrders } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

          const matched = (recentOrders || []).find(
            (o) => o.id.toLowerCase().startsWith(orderIdInput.toLowerCase()) || 
                   o.id.toLowerCase().endsWith(orderIdInput.toLowerCase())
          );

          if (!matched) {
            return `❌ Pedido com código/sufixo \`${orderIdInput}\` não foi localizado entre os 100 últimos.`;
          }

          return formatOrderTrackResponse(matched);
        }

        const { data: order, error } = await query.single();

        if (error || !order) {
          return `❌ Pedido \`${orderIdInput}\` não foi encontrado.`;
        }

        return formatOrderTrackResponse(order);
      }

      case '/enviar': {
        // Expected: /enviar [id_pedido] [codigo_rastreio]
        // Example: /enviar a1b2c3d4 BR123456789BR
        const params = cleanMessage.replace(/^\/enviar\s*/i, '').trim().split(/\s+/);
        if (params.length < 2) {
          return '❌ Formato inválido. Use:\n`/enviar [ID do Pedido] [Código de Rastreio]`\n\nExemplo:\n`/enviar 5c3bd198 BR123456789BR`';
        }

        const orderIdInput = params[0];
        const trackingCode = params[1];

        // Find the order (handles partial or exact ID)
        let orderId = '';
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderIdInput);
        
        if (isUUID) {
          orderId = orderIdInput;
        } else {
          const { data: recentOrders } = await supabase
            .from('orders')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(100);

          const matched = (recentOrders || []).find((o) => o.id.toLowerCase().startsWith(orderIdInput.toLowerCase()));
          if (!matched) {
            return `❌ Pedido \`${orderIdInput}\` não foi encontrado nos últimos 100 registros.`;
          }
          orderId = matched.id;
        }

        // Update status to shipped and save tracking code
        const { data: updatedOrder, error } = await supabase
          .from('orders')
          .update({
            status: 'shipped',
            tracking_code: trackingCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select()
          .single();

        if (error || !updatedOrder) {
          return `❌ Erro ao atualizar o pedido com ID \`${orderIdInput}\`.`;
        }

        return `🚚 *Pedido Enviado com Sucesso:*\n\n• *ID:* \`${updatedOrder.id.slice(0, 8)}\`\n• *Cliente:* ${updatedOrder.customer_name}\n• *Status:* Enviado\n• *Rastreamento:* \`${trackingCode}\`\n\n_Uma notificação foi disparada ou pode ser enviada ao cliente no WhatsApp._`;
      }

      default:
        return `🤖 *Bananinha Store — WhatsApp Bot*\n\nDesculpe, não entendi o comando. Comandos disponíveis:\n\n` +
          `*📦 Estoque e Produtos:*\n` +
          `• \`/produtos\` - Lista camisetas cadastradas\n` +
          `• \`/produto novo [nome] [preço]\` - Adiciona rascunho\n` +
          `• \`/estoque [tamanho] [sku] [qtd]\` - Define estoque\n\n` +
          `*🏷️ Edição de Configurações (Home):*\n` +
          `• \`/banner [mensagem]\` - Altera barra de anúncio\n` +
          `• \`/hero [título] | [subtítulo]\` - Muda hero banner\n` +
          `• \`/frete gratis [valor]\` - Muda mínimo frete grátis\n\n` +
          `*📊 Relatórios e Envio:*\n` +
          `• \`/pedidos hoje\` - Resumo do dia\n` +
          `• \`/pedidos pendentes\` - Aguardando pagamento\n` +
          `• \`/faturamento mes\` - Faturamento mensal\n` +
          `• \`/rastrear [código_pedido]\` - Status do pedido\n` +
          `• \`/enviar [código_pedido] [código_rastreio]\` - Marca como enviado`;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Erro indefinido';
    return `🔥 *Erro ao processar comando:* ${errMsg}`;
  }
}

function formatOrderTrackResponse(order: any): string {
  const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const statusMap: Record<string, string> = {
    pending: '⏳ Pendente de pagamento',
    paid: '✅ Pago (Aguardando processamento)',
    processing: '🔄 Em preparação',
    shipped: '📦 Enviado / Em trânsito',
    delivered: '🏠 Entregue',
    cancelled: '❌ Cancelado',
    refunded: '💵 Reembolsado'
  };

  return `📊 *Informações do Pedido:* \n\n` +
    `• *ID:* \`${order.id}\`\n` +
    `• *Cliente:* ${order.customer_name}\n` +
    `• *Data:* ${date}\n` +
    `• *Valor Total:* R$ ${Number(order.total_amount).toFixed(2)}\n` +
    `• *Status:* ${statusMap[order.status] || order.status}\n` +
    `• *Método Envio:* ${order.shipping_method || 'Não especificado'}\n` +
    `• *Código de Rastreamento:* ${order.tracking_code ? `\`${order.tracking_code}\`` : '⚠️ Ainda não postado'}`;
}
