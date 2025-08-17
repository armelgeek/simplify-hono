"use client";

import { useState } from 'react';
import { toast } from 'sonner';

export interface UseUpdateProfileOptions {
  authClient: {
    updateUser: (data: { name?: string; image?: string }) => Promise<any>;
    changeEmail: (data: { newEmail: string }) => Promise<any>;
  };
}

export function useUpdateProfile(options: UseUpdateProfileOptions) {
  const { authClient } = options;
  const [isLoading, setIsLoading] = useState(false);

  const updateName = async (name: string) => {
    if (!name.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return false;
    }
    try {
      setIsLoading(true);
      await authClient.updateUser({ name });
      toast.success('Nom mis à jour avec succès');
      return true;
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Erreur lors de la mise à jour du nom');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmail = async (newEmail: string) => {
    if (!newEmail.trim()) {
      toast.error("L'email ne peut pas être vide");
      return false;
    }
    try {
      setIsLoading(true);
      await authClient.changeEmail({ newEmail });
      toast.success('Email mis à jour avec succès');
      return true;
    } catch (error) {
      console.error('Failed to update email:', error);
      toast.error("Erreur lors de la mise à jour de l'email");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvatar = async (imageUrl: string) => {
    try {
      setIsLoading(true);
      await authClient.updateUser({ image: imageUrl });
      toast.success('Photo de profil mise à jour avec succès');
      return true;
    } catch (error) {
      console.error('Failed to update avatar:', error);
      toast.error('Erreur lors de la mise à jour de la photo de profil');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateName,
    updateEmail,
    updateAvatar,
    isLoading
  };
}
