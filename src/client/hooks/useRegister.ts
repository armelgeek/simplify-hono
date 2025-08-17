
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * useRegister - Generic hook for user registration (sign up)
 *
 * @param authClient - The authentication client instance
 * @param options - Optional callbacks for request lifecycle
 * @returns { register, registerAsync, isPending, error }
 */
export function useRegister<Payload extends Record<string, any>>(
  authClient: {
    signUp: {
      email: (
        input: Payload
      ) => Promise<{ data?: any; error?: unknown }>;
    };
  },
  options?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
    onRequest?: () => void;
  }
) {
  const mutation = useMutation({
    mutationFn: async (input: Payload) => {
      options?.onRequest?.();
      const { data, error } = await authClient.signUp.email(input);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Registration successful!');
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error('Registration failed.');
      options?.onError?.(error);
    },
  });

  return {
    register: mutation.mutate,
    registerAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
