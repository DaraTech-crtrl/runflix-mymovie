import { isIOS, isMobileDevice } from './platform';

export type ShareResult = 'shared' | 'cancelled' | 'failed';

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * Share an image via the native sheet on mobile. Never triggers a file download.
 */
export async function shareImageNative(options: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
  url?: string;
}): Promise<ShareResult> {
  const { blob, filename, title, text, url } = options;

  if (!navigator.share) return 'failed';

  const file = new File([blob], filename, {
    type: blob.type || 'image/png',
  });

  // Combine text and URL properly to ensure the platform doesn't drop the link
  const fullText = url && !text.includes(url) ? `${text}\n\n${url}` : text;
  const filePayload: ShareData = { files: [file], title, text: fullText };

  // 1. Try file sharing first if platform officially supports it
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share(filePayload);
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) return 'cancelled';
    }
  } 
  // 2. iOS fallback (reports false for canShare sometimes but works anyway)
  else if (isMobileDevice()) {
    try {
      await navigator.share(filePayload);
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) return 'cancelled';
    }
  }

  // 3. Ultimate fallback (just text & link)
  try {
    await navigator.share({
      title,
      text: fullText,
      url,
    });
    return 'shared';
  } catch (err) {
    if (isAbortError(err)) return 'cancelled';
    return 'failed';
  }
}

/**
 * Save or export a blob. On iOS, opens the share sheet (Save to Photos).
 */
export async function saveImageBlob(
  blob: Blob,
  filename: string
): Promise<boolean> {
  if ((isIOS() || isMobileDevice()) && navigator.share) {
    try {
      const file = new File([blob], filename, {
        type: blob.type || 'image/png',
      });
      const payload: ShareData = { files: [file] };
      if (navigator.canShare && !navigator.canShare(payload)) {
        throw new Error('cannot share file');
      }
      await navigator.share(payload);
      return true;
    } catch (err) {
      if (isAbortError(err)) return false;
    }
  }

  try {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    return true;
  } catch {
    return false;
  }
}
