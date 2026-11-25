import { useEffect, useRef, useState } from "react";

export const useCopy = (timeout = 1500) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setCopied(false), timeout);
  };

  return { copied, copy };
};
