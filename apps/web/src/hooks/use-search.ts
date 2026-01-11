import { useState } from 'react';
import { useDebouncedValue } from '@tanstack/react-pacer';

/**
 * Custom hook for managing search input with debouncing
 * @param initialValue - Initial search value (default: empty string)
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Tuple of [debouncedValue, setValue, immediateValue]
 */
export function useSearch(
  initialValue: string = '',
  debounceMs: number = 300
): [string, (value: string) => void, string] {
  const [immediateValue, setImmediateValue] = useState(initialValue);
  const [debouncedValue] = useDebouncedValue(immediateValue, { wait: debounceMs });

  // Ensure debouncedValue is always a string
  const safeDebouncedValue = typeof debouncedValue === 'string' ? debouncedValue : (initialValue || '');

  return [safeDebouncedValue, setImmediateValue, immediateValue];
}
