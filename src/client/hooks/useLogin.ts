import { useState } from 'react';

export interface UseLoginOptions {
  authClient: {
    signIn: {
      email: (
        payload: { email: string; password: string },
        callbacks?: {
          onRequest?: () => void;
          onSuccess?: () => void;
          onError?: () => void;
        }
      ) => Promise<{ data: any }>;
    };
  };
  onSuccess?: () => void;
}

export const useLogin = (options: UseLoginOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const { authClient, onSuccess } = options;

  const handleSubmit = async (input: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { data } = await authClient.signIn.email(
        {
          email: input.email,
          password: input.password,
        },
        {
          onRequest: () => setIsLoading(true),
          onSuccess: async () => {
            if (typeof onSuccess === 'function') onSuccess();
          },
          onError: () => setIsLoading(false),
        },
      );
      return data;
    } catch (e) {
      const error = e instanceof Error ? e.message : '';
      console.log(error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSubmit, isLoading };
};
