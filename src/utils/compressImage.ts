import heic2any from 'heic2any';

/**
 * Comprime uma imagem no browser antes do upload.
 * Suporta JPG, PNG, WEBP e HEIC/HEIF (iPhone).
 * HEIC é convertido para JPEG via heic2any antes da compressão Canvas.
 *
 * @param file - Arquivo original
 * @param options - Configurações opcionais
 * @returns Promise<File> - Arquivo comprimido pronto para upload
 */
export async function compressImage(
  file: File,
  options?: {
    maxWidth?: number; // padrão: 1280
    quality?: number;  // padrão: 0.75 (0 a 1)
  }
): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1280;
  const quality = options?.quality ?? 0.75;

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const isHeic = fileExt === 'heic' || fileExt === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';

  // Pré-processar HEIC → JPEG blob antes de seguir para o Canvas
  let processableFile: File = file;

  if (isHeic) {
    if (import.meta.env.DEV) {
      console.log(`[COMPRESS DEBUG] Detectado HEIC/HEIF: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Convertendo para JPEG...`);
    }

    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality,
      });

      // heic2any pode retornar Blob ou Blob[] — normalizar
      const singleBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      processableFile = new File([singleBlob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      if (import.meta.env.DEV) {
        console.log(`[COMPRESS DEBUG] HEIC convertido para JPEG: ${(processableFile.size / 1024).toFixed(1)} KB`);
      }
    } catch (heicErr) {
      console.error('[COMPRESS DEBUG] Falha ao converter HEIC:', heicErr);
      throw new Error('Não foi possível converter a imagem HEIC. Tente converter para JPG antes de enviar.');
    }
  }

  // Validar formato (após possível conversão HEIC)
  const processableExt = processableFile.name.split('.').pop()?.toLowerCase();
  if (!processableFile.type.startsWith('image/') && !['jpg', 'jpeg', 'png', 'webp'].includes(processableExt || '')) {
    throw new Error('Formato de arquivo não suportado. Envie apenas imagens (JPG, PNG, WEBP ou HEIC).');
  }

  // Se o arquivo já for menor que 100KB, retornar sem reprocessar
  const BYPASS_SIZE = 100 * 1024;
  if (processableFile.size < BYPASS_SIZE) {
    if (import.meta.env.DEV) {
      console.log(`[COMPRESS DEBUG] Imagem "${processableFile.name}" menor que 100KB (${(processableFile.size / 1024).toFixed(1)}KB). Compressão Canvas ignorada.`);
    }
    return processableFile;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(processableFile);

    img.onload = () => {
      try {
        // Calcular novas dimensões mantendo proporção (nunca ampliar)
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Falha ao obter contexto 2D do Canvas.');
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('Erro ao converter Canvas em Blob.'));
              return;
            }

            const originalName = processableFile.name;
            const baseName = originalName.replace(/\.[^/.]+$/, "");
            const newFileName = `${baseName}.jpg`;

            const compressedFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            if (import.meta.env.DEV) {
              const originalSizeKB = file.size / 1024;
              const compressedSizeKB = compressedFile.size / 1024;
              const reductionPercent = ((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100;
              console.log('[COMPRESS DEBUG] Imagem comprimida com sucesso:', {
                nomeOriginal: file.name,
                nomeNovo: newFileName,
                tamanhoOriginal: `${originalSizeKB.toFixed(1)} KB`,
                tamanhoComprimido: `${compressedSizeKB.toFixed(1)} KB`,
                reducao: `${reductionPercent.toFixed(1)}%`,
                heicConvertido: isHeic,
              });
            }

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Erro ao carregar a imagem para processamento.'));
    };

    img.src = objectUrl;
  });
}
