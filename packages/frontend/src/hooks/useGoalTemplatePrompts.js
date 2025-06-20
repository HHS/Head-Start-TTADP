import { useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';
import { getGoalTemplatePrompts } from '../fetchers/goalTemplates';

export default function useGoalTemplatePrompts(goalTemplateId) {
  const [goalTemplatePrompts, setGoalTemplatePrompts] = useState(null);

  useDeepCompareEffectNoCheck(() => {
    async function fetchGoalTemplatePrompts() {
      try {
        const prompts = await getGoalTemplatePrompts(goalTemplateId);
        setGoalTemplatePrompts(prompts);
      } catch (error) {
        setGoalTemplatePrompts([]);
      }
    }
    if (goalTemplateId && !goalTemplatePrompts) {
      fetchGoalTemplatePrompts();
    }
  }, [goalTemplateId, goalTemplatePrompts]);

  return goalTemplatePrompts;
}
