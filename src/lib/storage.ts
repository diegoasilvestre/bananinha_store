import { supabase } from './supabase';
import { compressImage } from '../utils/compressImage';

const BUCKET_NAME = 'products';

/**
 * Realiza o upload de uma imagem para o bucket público 'products' do Supabase.
 * Retorna a URL pública da imagem ou null em caso de falha.
 */
export async function uploadProductImage(file: File): Promise<string | null> {
  try {
    // Debug: verificar sessão ativa
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('[UPLOAD DEBUG] Session check:', {
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id ?? 'N/A',
      email: sessionData?.session?.user?.email ?? 'N/A',
      sessionError: sessionError?.message ?? null,
    });

    if (!sessionData?.session) {
      console.error('[UPLOAD DEBUG] ERRO: Nenhuma sessão ativa. Usuário não está autenticado.');
      return null;
    }

    // Compress image before upload
    let finalFile = file;
    try {
      finalFile = await compressImage(file, { maxWidth: 1280, quality: 0.75 });
    } catch (compressErr) {
      console.error('[UPLOAD DEBUG] Erro na compressão, enviando original:', compressErr);
    }

    // Debug: info do arquivo
    console.log('[UPLOAD DEBUG] File info:', {
      name: finalFile.name,
      size: finalFile.size,
      type: finalFile.type,
      lastModified: finalFile.lastModified,
    });

    const fileExt = finalFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomSuffix}.${fileExt}`;
    const filePath = `images/${fileName}`;
    const contentType = finalFile.type || `image/${fileExt}`;

    console.log('[UPLOAD DEBUG] Uploading to:', { bucket: BUCKET_NAME, filePath, contentType });

    // Upload do arquivo para o bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, finalFile, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    console.log('[UPLOAD DEBUG] Upload response:', {
      data: uploadData,
      error: uploadError ? { message: uploadError.message, name: uploadError.name, cause: (uploadError as unknown as Record<string, unknown>).cause, statusCode: (uploadError as unknown as Record<string, unknown>).statusCode } : null,
    });

    if (uploadError) {
      throw uploadError;
    }

    // Obter URL pública do arquivo enviado
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log('[UPLOAD DEBUG] Public URL:', data?.publicUrl);

    if (!data?.publicUrl) {
      throw new Error('Não foi possível recuperar a URL pública do arquivo enviado.');
    }

    return data.publicUrl;
  } catch (error) {
    console.error('[UPLOAD DEBUG] ERRO FINAL:', error);
    return null;
  }
}

