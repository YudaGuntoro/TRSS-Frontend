"use client";

import { useEffect, useState } from "react";

export const useDebouncedValue = <T,>(value: T, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => globalThis.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
};
