import { ReactNode } from 'react';

// Keep AuthProvider for compatibility but it's just a passthrough now
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
