import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { apiRequest } from '@/lib/api-client';
import { Copy, Check, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

export const Route = createFileRoute('/_authenticated/extension-tokens')({
  component: ExtensionTokensPage,
});

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
}

interface TokensResponse {
  tokens: Token[];
}

function ExtensionTokensPage() {
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Load existing tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const data = await apiRequest<TokensResponse>('/api/tokens');
      setTokens(data.tokens);
    } catch (err) {
      console.error('Error loading tokens:', err);
      // Don't show error on initial load if user has no tokens
    }
  };

  const generateToken = async () => {
    if (!tokenName.trim()) {
      setError('Please enter a name for the token');
      return;
    }

    setLoading(true);
    setError('');
    setNewToken(null);

    try {
      // Generate a JWT token using Better Auth's JWT plugin
      const result = await authClient.token();
      
      if (!result.data?.token) {
        throw new Error(result.error?.message || 'Failed to generate token');
      }

      const token = result.data.token;

      // Save the token to the API with a name
      try {
        await apiRequest('/api/tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: tokenName.trim(),
            token: token,
          }),
        });

        // Show the token once so user can copy it
        setNewToken(token);
        setTokenName('');
        
        // Reload tokens list
        await loadTokens();
      } catch (saveErr) {
        // If saving fails, still show the token so user can copy it
        console.error('Error saving token to API:', saveErr);
        setNewToken(token);
        setTokenName('');
        setError(`Token generated but failed to save: ${saveErr instanceof Error ? saveErr.message : 'Unknown error'}. The token is shown below - copy it now.`);
        // Don't reload tokens list if save failed
      }
    } catch (err) {
      console.error('Error generating token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate token';
      
      // Provide more helpful error messages
      if (errorMessage.includes('JSON')) {
        setError('Failed to communicate with the server. Please check your connection and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        setError('Your session has expired. Please refresh the page and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (token: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(tokenId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token? It will stop working immediately.')) {
      return;
    }

    try {
      await apiRequest(`/api/tokens/${tokenId}`, {
        method: 'DELETE',
      });
      
      // Reload tokens list
      await loadTokens();
    } catch (err) {
      console.error('Error deleting token:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete token');
    }
  };

  const maskToken = (prefix: string, revealed: boolean) => {
    if (revealed) {
      return prefix;
    }
    // Show first 4 characters, mask the rest
    if (prefix.length <= 4) {
      return prefix;
    }
    return prefix.substring(0, 4) + '•'.repeat(12);
  };

  const toggleReveal = (tokenId: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  };

  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      <Card>
        <CardHeader>
          <CardTitle>Extension Tokens</CardTitle>
          <CardDescription>
            Generate and manage API tokens for use with the browser extension. Tokens are reusable until they expire or are deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {error && (
            <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
              {error}
            </div>
          )}

          {/* Generate new token */}
          <div className='space-y-4 p-4 border rounded-lg'>
            <h3 className='font-semibold'>Generate New Token</h3>
            <div className='space-y-2'>
              <Label htmlFor='token-name'>Token Name</Label>
              <Input
                id='token-name'
                type='text'
                placeholder='e.g., "My Extension Token"'
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    generateToken();
                  }
                }}
              />
              <p className='text-sm text-muted-foreground'>
                Give your token a name to identify it later
              </p>
            </div>
            <Button
              onClick={generateToken}
              disabled={loading || !tokenName.trim()}
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

            {/* Show new token once after generation */}
            {newToken && (
              <div className='space-y-2 p-4 bg-muted rounded-md'>
                <Label>Your New Token (copy this now - it won't be shown again)</Label>
                <div className='flex gap-2'>
                  <Input
                    type='text'
                    value={newToken}
                    readOnly
                    className='font-mono text-sm'
                  />
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() => copyToClipboard(newToken, 'new')}
                    title='Copy to clipboard'
                  >
                    {copiedId === 'new' ? (
                      <Check className='h-4 w-4 text-green-600' />
                    ) : (
                      <Copy className='h-4 w-4' />
                    )}
                  </Button>
                </div>
                <p className='text-sm text-muted-foreground'>
                  ⚠️ Copy this token now. You won't be able to see it again.
                </p>
              </div>
            )}
          </div>

          {/* Existing tokens list */}
          <div className='space-y-4'>
            <h3 className='font-semibold'>Your Tokens</h3>
            {tokens.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No tokens yet. Generate one above to get started.</p>
            ) : (
              <div className='space-y-2'>
                {tokens.map((token) => {
                  const revealed = revealedIds.has(token.id);
                  const masked = maskToken(token.token_prefix, revealed);
                  
                  return (
                    <div
                      key={token.id}
                      className='flex items-center justify-between p-4 border rounded-lg'
                    >
                      <div className='flex-1 space-y-1'>
                        <div className='font-medium'>{token.name}</div>
                        <div className='flex items-center gap-2'>
                          <code className='text-sm font-mono bg-muted px-2 py-1 rounded'>
                            {masked}
                          </code>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => toggleReveal(token.id)}
                            title={revealed ? 'Hide token' : 'Show token'}
                          >
                            {revealed ? (
                              <EyeOff className='h-4 w-4' />
                            ) : (
                              <Eye className='h-4 w-4' />
                            )}
                          </Button>
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Created {format(new Date(token.created_at), 'MMM d, yyyy')}
                          {token.last_used_at && (
                            <> • Last used {format(new Date(token.last_used_at), 'MMM d, yyyy')}</>
                          )}
                          {token.expires_at && (
                            <> • Expires {format(new Date(token.expires_at), 'MMM d, yyyy')}</>
                          )}
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => {
                            // For copying, we need the full token, but we only have the prefix
                            // So we'll show a message that they need to regenerate
                            alert('To copy the full token, you need to regenerate it. The full token is only shown once when generated.');
                          }}
                          title='Copy token'
                        >
                          {copiedId === token.id ? (
                            <Check className='h-4 w-4 text-green-600' />
                          ) : (
                            <Copy className='h-4 w-4' />
                          )}
                        </Button>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => deleteToken(token.id)}
                          title='Delete token'
                        >
                          <Trash2 className='h-4 w-4 text-destructive' />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Server URL info */}
          <div className='p-4 bg-muted rounded-lg'>
            <Label htmlFor='server-url'>Server URL</Label>
            <Input
              id='server-url'
              type='text'
              defaultValue={import.meta.env.VITE_API_URL || 'http://localhost:1337'}
              readOnly
              className='bg-background mt-1'
            />
            <p className='text-sm text-muted-foreground mt-1'>
              Use this URL when configuring the extension
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
