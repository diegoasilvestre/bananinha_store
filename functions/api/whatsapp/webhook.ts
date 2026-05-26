import { createClient } from '@supabase/supabase-js';
import { handleBotCommand } from '../../../src/lib/botHandler';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WHATSAPP_SECRET: string;
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

    // 2. Parse body (could be Evolution API or n8n webhook payload)
    const body = (await request.json()) as any;

    // Determine message text and sender
    let messageText = '';
    let senderPhone = '';

    // Check Evolution API pattern
    if (body.event === 'messages.upsert' && body.data?.message) {
      const data = body.data;
      messageText = data.message.conversation || 
                    data.message.extendedTextMessage?.text || 
                    '';
      senderPhone = data.key?.remoteJid?.split('@')[0] || '';
    } 
    // Check custom/n8n simplified pattern
    else if (body.message || body.text) {
      messageText = (body.message || body.text || '') as string;
      senderPhone = (body.sender || body.phone || '') as string;
    }

    if (!messageText) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'No message content' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Initialize Supabase Admin client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 4. Handle command
    const replyText = await handleBotCommand(messageText, senderPhone, supabase);

    // 5. Return JSON payload for n8n to send back
    return new Response(JSON.stringify({ reply: replyText }), {
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
