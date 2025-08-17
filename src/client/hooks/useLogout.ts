import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface UseLogoutOptions {
  authClient: {
    signOut: () => Promise<any>;
  };
  clearSession?: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  invalidateKeys?: Array<string | string[]>;
  navigate?: (to: string) => void;
  redirectTo?: string;
}

export function useLogout(options: UseLogoutOptions) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const {
    authClient,
    onSuccess,
    onError,
    invalidateKeys = [],
  } = options;

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await Promise.all(
        invalidateKeys.map((key) => {
          const queryKey = Array.isArray(key) ? key : [key];
          return queryClient.invalidateQueries({ queryKey });
        })
      );
      await authClient.signOut();
      if (typeof onSuccess === 'function') onSuccess();
    } catch (error) {
      if (typeof onError === 'function') onError(error);
      else console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    logout,
    isLoggingOut
  };
}
