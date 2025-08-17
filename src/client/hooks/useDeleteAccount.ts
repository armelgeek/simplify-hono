import { useState } from 'react';
import { toast } from 'sonner';

export interface UseDeleteAccountOptions {
  authClient: {
    deleteUser: (payload: { password: string }) => Promise<{ data?: { success?: boolean }, error?: { message?: string } }>;
  };
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useDeleteAccount(options: UseDeleteAccountOptions) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { authClient, onSuccess, onError } = options;

  const handleDeleteAccount = async (password: string) => {
    setIsDeleting(true);
    try {
      const response = await authClient.deleteUser({ password });
      if (response.data?.success) {
        toast.success("Votre compte a été supprimé avec succès");
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        toast.error(response.error?.message || "Erreur lors de la suppression du compte");
        if (typeof onError === 'function') onError(response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur inattendue s'est produite";
      toast.error(errorMessage);
      if (typeof onError === 'function') onError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDeleteAccount,
    isDeleting
  };
}
