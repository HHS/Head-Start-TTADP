import type { Location } from 'history';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

interface UseNavigationPromptModalOptions {
  when: boolean;
  onSave: () => Promise<boolean>;
}

export default function useNavigationPromptModal({
  when,
  onSave,
}: UseNavigationPromptModalOptions) {
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingLocation = useRef<Location | null>(null);
  const bypassNextNavigation = useRef(false);

  useEffect(() => {
    if (!when) {
      return undefined;
    }

    return history.block((location) => {
      if (bypassNextNavigation.current) {
        bypassNextNavigation.current = false;
        return undefined;
      }

      if (location.pathname === '/logout') {
        return undefined;
      }

      pendingLocation.current = location;
      setIsOpen(true);
      return false;
    });
  }, [history, when]);

  const dismiss = useCallback(() => {
    pendingLocation.current = null;
    setIsOpen(false);
  }, []);

  const continueWithoutSaving = useCallback(() => {
    const destination = pendingLocation.current;
    dismiss();

    if (destination) {
      bypassNextNavigation.current = true;
      history.push(destination);
    }
  }, [dismiss, history]);

  const bypassOnce = useCallback(() => {
    bypassNextNavigation.current = true;
  }, []);

  const saveAndContinue = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await onSave();
      if (saved) {
        continueWithoutSaving();
      } else {
        dismiss();
      }
    } finally {
      setIsSaving(false);
    }
  }, [continueWithoutSaving, dismiss, isSaving, onSave]);

  return {
    isOpen,
    isSaving,
    bypassOnce,
    continueWithoutSaving,
    dismiss,
    saveAndContinue,
  };
}
