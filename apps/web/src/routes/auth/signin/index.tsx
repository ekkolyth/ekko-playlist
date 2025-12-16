import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from '@/lib/auth-client';
import Header from '@/components/nav/header';

export const Route = createFileRoute('/auth/signin/')({
  component: SignInPage,
});

function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate with Better Auth (uses cookie-based sessions for web)
      const signInResult = await signIn.email({
        email,
        password,
      });

      if (!signInResult.data) {
        throw new Error(signInResult.error?.message || 'Sign in failed');
      }

      // Bearer token for API calls - try to get from session if not in headers
      const { getSessionToken } = await import('@/lib/auth-client');
      const sessionToken = await getSessionToken();
      if (sessionToken && typeof window !== 'undefined') {
        localStorage.setItem('better_auth_bearer_token', sessionToken);
        console.log('Bearer token stored from session');
      }

      navigate({ to: '/dashboard' });
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='flex items-center justify-center px-6 py-24'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your email and password to sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className='space-y-4'
            >
              {error && (
                <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
                  {error}
                </div>
              )}
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button
                type='submit'
                className='w-full'
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className='text-center text-sm text-muted-foreground'>
                Don't have an account?{' '}
                <Link
                  to='/auth/signup'
                  className='text-primary hover:underline'
                >
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

