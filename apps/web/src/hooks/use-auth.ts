import { useSession, signOut as authSignOut } from '@/lib/auth-client';

// Re-export Better Auth's useSession as useAuth for compatibility
export function useAuth() {
  const session = useSession();
  const loading = session.isPending;

  return {
    user: session.data?.user || null,
    loading,
    isAuthenticated: !!session.data?.user,
    logout: async () => {
      await authSignOut();
    },
  };
}





