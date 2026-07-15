import { useCallback, useEffect, useRef, useState } from 'react';
import type { AlertColor } from '@mui/material';

export interface InlineNotice {
  severity: AlertColor;
  message: string;
}

/**
 * Small helper for showing status messages inline (as an MUI <Alert>) instead
 * of as top-right toasts. Success/info/warning notices auto-dismiss after
 * `autoHideMs`; errors stay until the user retries or dismisses them.
 */
export function useInlineNotice(autoHideMs = 5000) {
  const [notice, setNotice] = useState<InlineNotice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const clear = useCallback(() => {
    stopTimer();
    setNotice(null);
  }, []);

  const notify = useCallback((severity: AlertColor, message: string) => {
    stopTimer();
    setNotice({ severity, message });
    if (severity !== 'error' && autoHideMs > 0) {
      timer.current = setTimeout(() => setNotice(null), autoHideMs);
    }
  }, [autoHideMs]);

  // Clear any pending timer on unmount.
  useEffect(() => stopTimer, []);

  return { notice, notify, clear };
}

export default useInlineNotice;
