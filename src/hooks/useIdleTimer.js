import { useEffect, useRef, useCallback, useState } from "react";

export function useIdleTimer(timeoutMs = 15000, enabled = false) {
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [isIdle, setIsIdle] = useState(false);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);
  }, []);

  useEffect(() => {
    if (!enabled || timeoutMs === 0) {
      setIsIdle(false);
      return;
    }

    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    timerRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        setIsIdle(true);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(timerRef.current);
    };
  }, [timeoutMs, enabled, resetTimer]);

  return isIdle;
}
