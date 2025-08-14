import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { getGoalTemplates } from '../fetchers/goalTemplates';

export default function useGoalTemplates(selectedGrants, filterOutUsedTemplates = false) {
  const [goalTemplates, setGoalTemplates] = useState(null);

  // using DeepCompareEffect to avoid unnecessary fetches
  // as we have an object (selectedGrant) in the dependency array
  useDeepCompareEffect(() => {
    async function fetchGoalTemplates() {
      try {
        const templates = await getGoalTemplates(selectedGrants.map((grant) => grant.id));

        if (filterOutUsedTemplates) {
          setGoalTemplates(templates.filter((template) => !template.goals.length));
        } else {
          setGoalTemplates(templates);
        }
      } catch (err) {
        setGoalTemplates([]);
      }
    }

    if (selectedGrants[0] && selectedGrants[0].id) {
      fetchGoalTemplates();
    }
  }, [selectedGrants]);

  return goalTemplates;
}
