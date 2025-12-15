import { ReactNode } from 'react';
import { useSession, signOut as authSignOut } from '@/lib/auth-client';
import { clearApiToken } from '@/lib/api-client';

// Re-export Better Auth's useSession as useAuth for compatibility
export function useAuth() {
  const session = useSession();
  const loading = session.isPending;

  return {
    user: session.data?.user || null,
    loading,
    isAuthenticated: !!session.data?.user,
    logout: async () => {
      clearApiToken();
      await authSignOut();
    },
  };
}

// Keep AuthProvider for compatibility but it's just a passthrough now
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
