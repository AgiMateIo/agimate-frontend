import { useState, useEffect } from 'react';

// 300ms is what every call site in the app passes: long enough that typing a
// word does not fire a request per keystroke, short enough that the list still
// feels like it answers the keyboard.
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
