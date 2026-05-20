type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export function isElementFullscreen(el: Element | null): boolean {
  if (!el) return false;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  const active =
    document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  return active === el || el.contains(active);
}

export async function requestElementFullscreen(
  el: HTMLElement
): Promise<void> {
  const target = el as FullscreenElement;

  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }
  if (target.webkitRequestFullscreen) {
    await Promise.resolve(target.webkitRequestFullscreen());
    return;
  }
  if (target.msRequestFullscreen) {
    await Promise.resolve(target.msRequestFullscreen());
    return;
  }

  throw new Error('Fullscreen API is not supported');
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  if (doc.webkitExitFullscreen) {
    await Promise.resolve(doc.webkitExitFullscreen());
    return;
  }
  if (doc.msExitFullscreen) {
    await Promise.resolve(doc.msExitFullscreen());
  }
}

export async function toggleElementFullscreen(
  el: HTMLElement
): Promise<boolean> {
  if (isElementFullscreen(el)) {
    await exitFullscreen();
    return false;
  }
  await requestElementFullscreen(el);
  return true;
}
