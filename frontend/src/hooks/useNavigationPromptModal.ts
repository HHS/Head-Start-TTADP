import type { Action, Location } from 'history';
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
  const pendingTransition = useRef<{ location: Location; action: Action } | null>(null);
  const bypassNextNavigation = useRef(false);

  useEffect(() => {
    if (!when) {
      return undefined;
    }

    return history.block((location, action) => {
      if (bypassNextNavigation.current) {
        bypassNextNavigation.current = false;
        return undefined;
      }

      if (location.pathname === '/logout') {
        return undefined;
      }

      pendingTransition.current = { location, action };
      setIsOpen(true);
      return false;
    });
  }, [history, when]);

  const dismiss = useCallback(() => {
    pendingTransition.current = null;
    setIsOpen(false);
  }, []);

  const continueWithoutSaving = useCallback(() => {
    const transition = pendingTransition.current;
    dismiss();

    if (!transition) {
      return;
    }

    bypassNextNavigation.current = true;
    const { location, action } = transition;
    if (action === 'REPLACE') {
      history.replace(location);
    } else {
      // Browser history v4 reports Back and Forward both as POP and doesn't expose
      // how far a POP moved, so a POP can't be replayed exactly. Pushing the
      // destination always lands the user on the right page, at the cost of
      // duplicating this page in the stack and dropping any forward entries.
      history.push(location);
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
