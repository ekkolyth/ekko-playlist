import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { Copy, Check, RefreshCw } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/extension-tokens')({
  component: ExtensionTokensPage,
});

function ExtensionTokensPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    setError('');
    setToken(null);
    setCopied(false);

    try {
      // Generate a fresh one-time token using Better Auth's one-time token plugin
      // This creates a new token specifically for API access, separate from the session
      const result = await authClient.oneTimeToken.generate();
      
      if (result.data?.token) {
        setToken(result.data.token);
      } else {
        throw new Error(result.error?.message || 'Failed to generate token');
      }
    } catch (err) {
      console.error('Error generating one-time token:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!token) return;

    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className='container mx-auto px-4 py-8 max-w-2xl'>
      <Card>
        <CardHeader>
          <CardTitle>Extension Tokens</CardTitle>
          <CardDescription>
            Generate a one-time token for use with the browser extension. This token is separate from your session and expires after 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {error && (
            <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
              {error}
            </div>
          )}

          <div className='space-y-4'>
            <div>
              <Label htmlFor='server-url'>Server URL</Label>
              <Input
                id='server-url'
                type='text'
                defaultValue={import.meta.env.VITE_API_URL || 'http://localhost:1337'}
                readOnly
                className='bg-muted'
              />
              <p className='text-sm text-muted-foreground mt-1'>
                Use this URL when configuring the extension
              </p>
            </div>

            <div>
              <Button
                onClick={generateToken}
                disabled={loading}
                className='w-full'
              >
                {loading ? (
                  <>
                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    Generate Token
                  </>
                )}
              </Button>
            </div>

            {token && (
              <div className='space-y-2'>
                <Label>Your API Token</Label>
                <div className='flex gap-2'>
                  <Input
                    type='text'
                    value={token}
                    readOnly
                    className='font-mono text-sm bg-muted'
                  />
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={copyToClipboard}
                    title='Copy to clipboard'
                  >
                    {copied ? (
                      <Check className='h-4 w-4 text-green-600' />
                    ) : (
                      <Copy className='h-4 w-4' />
                    )}
                  </Button>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Copy this token and paste it into the extension configuration. Keep it secure and
                  don't share it with anyone.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

