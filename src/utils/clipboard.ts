/**
 * Copy text in a way that works on iOS Safari and installed PWAs.
 * Prefer calling the sync variant directly inside click handlers.
 */
export function copyTextToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText =
      'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;opacity:0;';
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    textarea.setSelectionRange(0, text.length);

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    selection?.removeAllRanges();
    if (ok) return true;
  } catch {
    // fall through to async API
  }

  return false;
}

export async function copyTextToClipboardAsync(text: string): Promise<boolean> {
  if (copyTextToClipboard(text)) return true;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}
