
import { useState } from "react";
import { toast } from 'sonner';

export interface UseResetPasswordOptions {
  authClient: {
    resetPassword: (payload: { newPassword: string; token: string }) => Promise<any>;
  };
  onSuccess?: () => void;
}

export const useResetPassword = (token: string | null, options: UseResetPasswordOptions) => {
  const [pending, setPending] = useState<boolean>(false);
  const { authClient, onSuccess } = options;

  const handleResetPassword = async (values: { password: string }): Promise<void> => {
    if (!token) {
      toast.error("Aucun token fourni.");
      return;
    }
    setPending(true);
    try {
      await authClient.resetPassword({
        newPassword: values.password,
        token: token,
      });
      toast.info("Mot de passe réinitialisé avec succès. Connectez-vous pour continuer.");
      if (typeof onSuccess === 'function') onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue.";
      toast.error(errorMessage);
    } finally {
      setPending(false);
    }
  };

  return { handleResetPassword, pending };
};
