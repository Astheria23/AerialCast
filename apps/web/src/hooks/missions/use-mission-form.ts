import { useState } from 'react';
import type { Mission } from '@/types/missions.types';

export function useMissionForm() {
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormOpen = Boolean(formMode);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingMission(null);
    setFormError(null);
  };

  const openEditForm = (mission: Mission) => {
    setFormMode('edit');
    setEditingMission(mission);
    setFormError(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingMission(null);
    setFormError(null);
  };

  return {
    formMode,
    editingMission,
    formError,
    setFormError,
    isSubmitting,
    setIsSubmitting,
    isFormOpen,
    openCreateForm,
    openEditForm,
    closeForm,
  };
}
