import { useState } from 'react';
import { useForm, revalidateLogic } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface GenerateTokenCardProps {
  onTokenGenerated?: () => void;
}

// Zod schema for token name validation
const tokenNameSchema = z.object({
  tokenName: z.string().min(1, 'Please enter a name for the token'),
});

export function GenerateTokenCard({ onTokenGenerated }: GenerateTokenCardProps) {
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      tokenName: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        // Ensure value is an object with expected shape
        if (!value || typeof value !== 'object' || !('tokenName' in value)) {
          return undefined;
        }
        const result = tokenNameSchema.safeParse(value);
        if (!result.success && result.error) {
          const errors: Record<string, string> = {};
          result.error.issues.forEach((err) => {
            const path = err.path.join('.');
            errors[path] = err.message;
          });
          return errors;
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setError('');
      try {
        // Generate a JWT token using Better Auth's JWT plugin
        const result = await authClient.token();

        if (!result.data?.token) {
          throw new Error(result.error?.message || 'Failed to generate token');
        }

        const token = result.data.token;

        // Save the token to the API with a name
        try {
          const res = await fetch('/api/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              name: value.tokenName.trim(),
              token: token,
            }),
          });
          if (!res.ok) {
            const error = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(error.message || 'Failed to create token');
          }

          // Show the token once so user can copy it
          form.setFieldValue('tokenName', '');
          setNewToken(token);
          setError('');

          // Notify parent to reload tokens list
          onTokenGenerated?.();
        } catch (saveErr) {
          // If saving fails, still show the token so user can copy it
          console.error('Error saving token to API:', saveErr);
          setNewToken(token);
          form.setFieldValue('tokenName', '');
          setError(
            `Token generated but failed to save: ${saveErr instanceof Error ? saveErr.message : 'Unknown error'}. The token is shown below - copy it now.`
          );
        }
      } catch (err) {
        console.error('Error generating token:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate token';

        // Provide more helpful error messages
        if (errorMessage.includes('JSON')) {
          setError(
            'Failed to communicate with the server. Please check your connection and try again.'
          );
        } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
          setError('Your session has expired. Please refresh the page and try again.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(errorMessage);
        }
      }
    },
  });

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
        <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>{error}</div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldSet>
          <FieldGroup>
            <form.Field
              name='tokenName'
              validators={{
                onBlur: ({ value }) => {
                  if (!value || !value.trim()) {
                    return 'Please enter a name for the token';
                  }
                  return undefined;
                },
              }}
              children={(field) => (
                <>
                  <Field>
                    <FieldLabel htmlFor={field.name}>Token Name</FieldLabel>
                    <FieldContent>
                      <Input
                        id={field.name}
                        type='text'
                        placeholder='e.g., "My Extension Token"'
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !form.state.isSubmitting) {
                            e.preventDefault();
                            form.handleSubmit();
                          }
                        }}
                        aria-invalid={!!field.state.meta.errors.length}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      )}
                      <p className='text-sm text-muted-foreground'>
                        Give your token a name to identify it later
                      </p>
                    </FieldContent>
                  </Field>
                  <Button
                    type='submit'
                    disabled={form.state.isSubmitting || !field.state.value?.trim()}
                    className='w-full mt-4'
                  >
                    {form.state.isSubmitting ? (
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
                </>
              )}
            />
          </FieldGroup>
        </FieldSet>
      </form>

      {/* Show new token once after generation */}
      {newToken && (
        <div className='space-y-2 p-4 bg-muted rounded-md'>
          <FieldLabel>Your New Token (copy this now - it won't be shown again)</FieldLabel>
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
