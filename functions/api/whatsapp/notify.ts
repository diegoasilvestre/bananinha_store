interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WHATSAPP_SECRET: string;
  WHATSAPP_NOTIFICATION_URL: string;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  try {
    // 1. Authorize webhook request
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    const headerSecret = request.headers.get('X-WhatsApp-Secret');
    const expectedSecret = env.WHATSAPP_SECRET;

    if (expectedSecret && querySecret !== expectedSecret && headerSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse payload
    const body = (await request.json()) as any;
    const { event, payload } = body;

    if (!event || !payload) {
      return new Response(JSON.stringify({ error: 'Missing event or payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Format message based on event type
    let messageText = '';

    switch (event) {
      case 'order_created': {
        const { order } = payload;
        const total = Number(order.total_amount).toFixed(2);
        const subtotal = Number(order.subtotal).toFixed(2);
        messageText = `🛍️ *Novo Pedido Recebido!* \n\n` +
          `• *ID:* \`${order.id.slice(0, 8)}\`\n` +
          `• *Cliente:* ${order.customer_name}\n` +
          `• *E-mail:* ${order.customer_email}\n` +
          `• *Fone:* ${order.customer_phone || 'Não informado'}\n` +
          `• *Subtotal:* R$ ${subtotal}\n` +
          `• *Frete:* R$ ${Number(order.shipping_amount).toFixed(2)} (${order.shipping_method})\n` +
          `• *Total:* R$ ${total}\n` +
          `• *Pagamento:* ${order.payment_method === 'pix' ? 'Pix' : 'Cartão'}\n\n` +
          `_Acesse o Painel Admin para processar._`;
        break;
      }

      case 'order_paid': {
        const { order } = payload;
        const total = Number(order.total_amount).toFixed(2);
        const subtotal = Number(order.subtotal).toFixed(2);
        const items = order.order_items || [];
        
        let itemsText = '';
        for (const item of items) {
          itemsText += `  - ${item.product_name} (${item.size}) x${item.quantity} - R$ ${Number(item.unit_price).toFixed(2)}\n`;
        }

        messageText = `✅ *Pedido Pago & Aprovado!* \n\n` +
          `• *ID:* \`${order.id.slice(0, 8)}\`\n` +
          `• *Cliente:* ${order.customer_name}\n` +
          `• *E-mail:* ${order.customer_email}\n` +
          `• *Fone:* ${order.customer_phone || 'Não informado'}\n\n` +
          `📦 *Itens do Pedido:* \n${itemsText}\n` +
          `🚚 *Entrega:* \n` +
          `  - Rua: ${order.address_street}, ${order.address_number}\n` +
          `  - Bairro: ${order.address_neighborhood || 'N/A'}\n` +
          `  - Compl: ${order.address_complement || 'N/A'}\n` +
          `  - Cidade/UF: ${order.address_city} - ${order.address_state}\n` +
          `  - CEP: ${order.address_zip}\n\n` +
          `💰 *Financeiro:* \n` +
          `  - Subtotal: R$ ${subtotal}\n` +
          `  - Frete: R$ ${Number(order.shipping_amount).toFixed(2)} (${order.shipping_method})\n` +
          `  - Total Pago: R$ ${total}\n` +
          `  - Método: ${order.payment_method === 'pix' ? 'Pix' : 'Cartão'}\n\n` +
          `_Pronto para envio! Acesse o painel para atualizar o rastreamento._`;
        break;
      }

      case 'order_status_updated': {
        const { order, oldStatus, newStatus } = payload;
        const statusMap: Record<string, string> = {
          pending: '⏳ Pendente',
          paid: '✅ Pago (Processando)',
          processing: '🔄 Em Preparação',
          shipped: '📦 Enviado',
          delivered: '🏠 Entregue',
          cancelled: '❌ Cancelado',
          refunded: '💵 Reembolsado'
        };

        const oldLabel = statusMap[oldStatus] || oldStatus;
        const newLabel = statusMap[newStatus] || newStatus;

        messageText = `🔔 *Status do Pedido Atualizado!* \n\n` +
          `• *ID:* \`${order.id.slice(0, 8)}\`\n` +
          `• *Cliente:* ${order.customer_name}\n` +
          `• *De:* ${oldLabel}\n` +
          `• *Para:* *${newLabel}*\n`;

        if (newStatus === 'shipped' && order.tracking_code) {
          messageText += `• *Rastreamento:* \`${order.tracking_code}\`\n\n` +
            `_Cliente notificado sobre o envio._`;
        }
        break;
      }

      case 'stock_out': {
        const { product, size, sku } = payload;
        messageText = `⚠️ *Alerta de Estoque Esgotado!* \n\n` +
          `• *Produto:* ${product.name}\n` +
          `• *SKU:* \`${sku}\`\n` +
          `• *Tamanho:* ${size}\n\n` +
          `_Por favor, providencie a reposição de estoque no painel._`;
        break;
      }

      case 'price_alert': {
        const { product, size, email, alert_type } = payload;
        const typeLabel = alert_type === 'restock' ? 'Volta ao Estoque' : 'Queda de Preço';
        messageText = `🔔 *Novo Alerta de Cliente:* \n\n` +
          `• *Tipo:* ${typeLabel}\n` +
          `• *Produto:* ${product.name}\n` +
          `• *Tamanho:* ${size || 'Todos'}\n` +
          `• *E-mail:* ${email}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Event ${event} not supported` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // 4. Dispatch to n8n if notification URL is set
    const notificationUrl = env.WHATSAPP_NOTIFICATION_URL;
    let dispatched = false;

    if (notificationUrl) {
      try {
        const res = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WhatsApp-Secret': expectedSecret || ''
          },
          body: JSON.stringify({
            message: messageText,
            event,
            payload
          })
        });
        dispatched = res.ok;
      } catch (err) {
        console.error('Error forwarding notification to n8n:', err);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: messageText,
      dispatched 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
