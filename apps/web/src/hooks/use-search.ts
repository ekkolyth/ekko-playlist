import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { useNavigate, useSearch as useRouterSearch } from '@tanstack/react-router';

/**
 * Custom hook for managing search input with debouncing
 * @param initialValue - Initial search value (default: empty string)
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @param syncWithUrl - Whether to sync search value with URL query params (default: false)
 * @returns Tuple of [debouncedValue, setValue, immediateValue]
 */
export function useSearch(
  initialValue: string = '',
  debounceMs: number = 300,
  syncWithUrl: boolean = false
): [string, (value: string) => void, string] {
  const navigate = useNavigate();
  const searchParams = useRouterSearch({ strict: false }) as { search?: string };
  
  // Initialize from URL if syncing is enabled
  const [immediateValue, setImmediateValue] = useState(() => {
    return syncWithUrl ? (searchParams.search || '') : initialValue;
  });
  
  const [debouncedValue] = useDebouncedValue(immediateValue, { wait: debounceMs });

  // Write to URL when debounced value changes (one-way sync: state -> URL)
  useEffect(() => {
    if (!syncWithUrl) return;
    
    const currentSearch = searchParams.search || '';
    if (debouncedValue !== currentSearch) {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          search: debouncedValue || undefined, // Remove param if empty
        }),
        replace: true, // Don't create history entries for search changes
      });
    }
    // Note: searchParams.search is intentionally NOT in deps to avoid loops
    // We only want to update URL when user changes input (debouncedValue changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue, syncWithUrl, navigate]);

  // Ensure debouncedValue is always a string
  const safeDebouncedValue = typeof debouncedValue === 'string' ? debouncedValue : (initialValue || '');

  return [safeDebouncedValue, setImmediateValue, immediateValue];
}
