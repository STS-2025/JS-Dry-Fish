import { useEffect } from 'react';

let lockCount = 0;
let savedStyles = null;
let savedScrollY = 0;

function acquireBodyScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return () => {};
  }

  if (lockCount === 0) {
    const body = document.body;
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    savedStyles = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow
    };

    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0 || !savedStyles) return;

    const body = document.body;
    body.style.position = savedStyles.bodyPosition;
    body.style.top = savedStyles.bodyTop;
    body.style.left = savedStyles.bodyLeft;
    body.style.right = savedStyles.bodyRight;
    body.style.width = savedStyles.bodyWidth;
    body.style.overflow = savedStyles.bodyOverflow;
    document.documentElement.style.overflow = savedStyles.htmlOverflow;
    window.scrollTo(0, savedScrollY);
    savedStyles = null;
  };
}

export default function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;
    return acquireBodyScrollLock();
  }, [isLocked]);
}
