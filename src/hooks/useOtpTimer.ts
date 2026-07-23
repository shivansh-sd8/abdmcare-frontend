import { useCallback, useEffect, useRef, useState } from 'react';

interface UseOtpTimerOptions {
  /** Cooldown in seconds before Resend becomes available. ABDM spec: 60s. */
  cooldownSeconds?: number;
  /** Maximum number of resends allowed. ABDM spec: 2. */
  maxResends?: number;
}

export interface OtpTimer {
  /** Seconds remaining before the Resend button re-enables. */
  secondsLeft: number;
  /** How many resends have been consumed so far. */
  resendCount: number;
  /** True when a resend is currently permitted (cooldown elapsed + under limit). */
  canResend: boolean;
  /** True once the resend limit has been reached. */
  resendsExhausted: boolean;
  /** Configured maximum resends. */
  maxResends: number;
  /** Call when the FIRST OTP is sent — resets the counter and starts the cooldown. */
  startInitial: () => void;
  /** Call after a successful resend — increments the counter and restarts the cooldown. */
  registerResend: () => void;
  /** Clear all state (e.g. when leaving the OTP screen). */
  reset: () => void;
}

/**
 * Countdown + resend-limit timer for OTP screens.
 *
 * Implements the ABDM M1 requirement (CRT_ABHA_106 / VRFY_ABHA_305 / _405):
 * "System may activate the Resend OTP button maximum 2 times after 60 seconds."
 */
export function useOtpTimer(options: UseOtpTimerOptions = {}): OtpTimer {
  const cooldownSeconds = options.cooldownSeconds ?? 60;
  const maxResends = options.maxResends ?? 2;

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(() => {
    clear();
    setSecondsLeft(cooldownSeconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clear();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clear, cooldownSeconds]);

  const startInitial = useCallback(() => {
    setResendCount(0);
    startCooldown();
  }, [startCooldown]);

  const registerResend = useCallback(() => {
    setResendCount((c) => c + 1);
    startCooldown();
  }, [startCooldown]);

  const reset = useCallback(() => {
    clear();
    setSecondsLeft(0);
    setResendCount(0);
  }, [clear]);

  useEffect(() => () => clear(), [clear]);

  const resendsExhausted = resendCount >= maxResends;
  const canResend = secondsLeft === 0 && !resendsExhausted;

  return {
    secondsLeft,
    resendCount,
    canResend,
    resendsExhausted,
    maxResends,
    startInitial,
    registerResend,
    reset,
  };
}

export default useOtpTimer;
