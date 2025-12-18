import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { apiRequest } from '@/lib/api-client';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface GenerateTokenCardProps {
  onTokenGenerated?: () => void;
}

export function GenerateTokenCard({ onTokenGenerated }: GenerateTokenCardProps) {
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        
        // Notify parent to reload tokens list
        onTokenGenerated?.();
      } catch (saveErr) {
        // If saving fails, still show the token so user can copy it
        console.error('Error saving token to API:', saveErr);
        setNewToken(token);
        setTokenName('');
        setError(`Token generated but failed to save: ${saveErr instanceof Error ? saveErr.message : 'Unknown error'}. The token is shown below - copy it now.`);
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

  return (
    <div className='space-y-4 p-4 border rounded-lg'>
      <h3 className='font-semibold'>Generate New Token</h3>
      {error && (
        <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
          {error}
        </div>
      )}
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
  );
}

