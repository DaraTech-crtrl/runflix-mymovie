let lockCount = 0;
let previousOverflow = '';

/**
 * Reference-counted body scroll lock so modals don't leave overflow:hidden stuck.
 */
export function lockBodyScroll(): void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = '';
  }
}

export function resetBodyScroll(): void {
  lockCount = 0;
  document.body.style.overflow = '';
  previousOverflow = '';
}
