import { useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';
import { getGoalTemplatePrompts } from '../fetchers/goalTemplates';

export default function useGoalTemplatePrompts(
  goalTemplateId,
  goalIds = [],
  isForActivityReport = false,
) {
  const [goalTemplatePrompts, setGoalTemplatePrompts] = useState(null);
  const [templatePrompts, setTemplatePrompts] = useState(null);
  // Because we are using this on the AR goal form
  // we need to clear prompts when the template changes.
  const [currentGoalTemplateId, setCurrentGoalTemplateId] = useState(null);

  useDeepCompareEffectNoCheck(() => {
    async function fetchGoalTemplatePrompts() {
      try {
        // The second return value "prompts" will only come back with a
        // value if forForActivityReport is true. This is so we can use the same
        // hook for both the AR and RTR goal forms.
        const [promptsWithResponses, prompts] = await getGoalTemplatePrompts(
          goalTemplateId,
          goalIds,
          isForActivityReport,
        );
        setTemplatePrompts(prompts);
        setGoalTemplatePrompts(isForActivityReport ? promptsWithResponses : prompts);
      } catch (error) {
        setGoalTemplatePrompts([]);
      }
    }

    if (!goalTemplateId) {
      return;
    }

    if ((!goalTemplatePrompts)
      || (goalTemplateId !== currentGoalTemplateId)) {
      setCurrentGoalTemplateId(goalTemplateId);
      fetchGoalTemplatePrompts();
    }
  }, [goalTemplateId, goalTemplatePrompts]);

  return [goalTemplatePrompts, templatePrompts];
}
