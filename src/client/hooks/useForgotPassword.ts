import { useState } from "react";
import { toast } from 'sonner';

export interface UseForgotPasswordOptions {
  authClient: {
    forgetPassword: (payload: { email: string; redirectTo?: string }) => Promise<any>;
  };
  redirectTo?: string;
  onSuccess?: () => void;
}

export const useForgotPassword = (options: UseForgotPasswordOptions) => {
  const [pending, setPending] = useState(false);
  const { authClient, redirectTo = "/reset-password", onSuccess } = options;

  const handleForgotPassword = async (values: { email: string }) => {
    setPending(true);
    try {
      await authClient.forgetPassword({
        email: values.email,
        redirectTo,
      });
      toast.info("Si un compte existe, vous recevrez un email pour réinitialiser votre mot de passe.");
      if (typeof onSuccess === 'function') onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error(errorMessage);
    } finally {
      setPending(false);
    }
  };

  return { handleForgotPassword, pending };
};
