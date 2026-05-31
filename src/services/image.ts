// Image Helper Service
// Hỗ trợ xử lý ảnh một cách thông minh và nhất quán trong toàn bộ ứng dụng

/**
 * Kiểm tra xem string có phải là URL ảnh không
 */
export function isImageUrl(str: string | undefined | null): boolean {
  if (!str) return false;
  return str.startsWith('http://') || 
         str.startsWith('https://') || 
         str.startsWith('data:image/') ||
         str.startsWith('/');
}

/**
 * Kiểm tra xem string có phải là base64 image không
 */
export function isBase64Image(str: string | undefined | null): boolean {
  if (!str) return false;
  return str.startsWith('data:image/');
}

/**
 * Kiểm tra xem string có phải là emoji không (đơn giản)
 */
export function isEmoji(str: string | undefined | null): boolean {
  if (!str) return false;
  // Emoji thường có length ngắn và không phải URL
  return str.length <= 4 && !isImageUrl(str);
}

/**
 * Lấy loại ảnh
 */
export type ImageType = 'url' | 'base64' | 'emoji' | 'none';

export function getImageType(str: string | undefined | null): ImageType {
  if (!str) return 'none';
  if (isBase64Image(str)) return 'base64';
  if (isImageUrl(str)) return 'url';
  if (isEmoji(str)) return 'emoji';
  return 'emoji'; // Fallback to emoji for any other text
}

/**
 * Convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

/**
 * Resize ảnh trước khi lưu (để tiết kiệm localStorage)
 */
export async function resizeImage(
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Validate image URL (kiểm tra có load được không)
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    // Timeout after 5s
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Tính kích thước ước lượng của base64 string (KB)
 */
export function getBase64SizeKB(base64: string): number {
  // Remove data:image/xxx;base64, prefix
  const base64Length = base64.length - (base64.indexOf(',') + 1);
  // Base64 encoded data is ~33% larger than raw
  const sizeInBytes = (base64Length * 3) / 4;
  return Math.round(sizeInBytes / 1024);
}

/**
 * Placeholder ảnh mặc định
 */
export const DEFAULT_COVER_EMOJI = 'STORY';
export const DEFAULT_PANEL_EMOJI = 'PANEL';

/**
 * Render helper - trả về props cho img hoặc emoji span
 */
export function getImageProps(
  imageStr: string | undefined | null, 
  alt: string = ''
): { type: 'img' | 'emoji'; src?: string; emoji?: string; alt: string } {
  const type = getImageType(imageStr);
  
  if (type === 'url' || type === 'base64') {
    return { type: 'img', src: imageStr!, alt };
  }
  
  return { 
    type: 'emoji', 
    emoji: imageStr || DEFAULT_COVER_EMOJI, 
    alt 
  };
}
