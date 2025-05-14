import { useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';
import { getGoalTemplatePrompts } from '../fetchers/goalTemplates';

export default function useGoalTemplatePrompts(goalTemplateId) {
  const [goalTemplatePrompts, setGoalTemplatePrompts] = useState(null);
  const [templatePrompts, setTemplatePrompts] = useState(null);
  // Because we are using this on the AR goal form
  // we need to clear prompts when the template changes.
  const [currentGoalTemplateId, setCurrentGoalTemplateId] = useState(null);

  useDeepCompareEffectNoCheck(() => {
    async function fetchGoalTemplatePrompts() {
      try {
        const [promptsWithResponses, prompts] = await getGoalTemplatePrompts(goalTemplateId);
        setTemplatePrompts(prompts);
        setGoalTemplatePrompts(promptsWithResponses);
      } catch (error) {
        setGoalTemplatePrompts([]);
      }
    }

    if (goalTemplateId && ((!goalTemplatePrompts)
      || (goalTemplateId !== currentGoalTemplateId))) {
      setCurrentGoalTemplateId(goalTemplateId);
      fetchGoalTemplatePrompts();
    }
  }, [goalTemplateId, goalTemplatePrompts]);

  return [goalTemplatePrompts, templatePrompts];
}
