/**
 * Reescreve dinamicamente as URLs do Supabase Storage para utilizar a API
 * de renderização e redimensionamento dinâmico em formato WebP.
 * 
 * @param url A URL original da imagem no Supabase Storage.
 * @param width A largura desejada da imagem em pixels.
 * @returns A URL da imagem otimizada com formato WebP ou a URL original.
 */
export function getOptimizedImageUrl(url: string | undefined | null, width: number): string {
  if (!url) return '';
  
  // Verifica se a URL pertence ao bucket do Supabase configurado
  if (url.includes('rlpcmwpfzdmqtfbtivgf.supabase.co/storage/v1/object/public/')) {
    return url
      .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&quality=80&format=webp&resize=contain`;
  }
  
  return url;
}
