import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { getGoalTemplates } from '../fetchers/goalTemplates';

export default function useGoalTemplates(
  selectedGrants, filterOutUsedTemplates = false,
  includeClosedSuspended = false,
) {
  const [goalTemplates, setGoalTemplates] = useState(null);

  // using DeepCompareEffect to avoid unnecessary fetches
  // as we have an object (selectedGrant) in the dependency array
  useDeepCompareEffect(() => {
    async function fetchGoalTemplates() {
      try {
        const templates = await getGoalTemplates(
          selectedGrants.map((grant) => grant.id || ''),
          includeClosedSuspended,
        );
        if (filterOutUsedTemplates) {
          // We want all templates that either have no goals or have goals but all of them
          // are prestandard (to allow the re-use of the template for a new standard goal from RTR).
          const filtered = templates.filter((template) => (
            !template.goals || template.goals.every((goal) => goal.prestandard === true)
          ));
          setGoalTemplates(
            filtered,
          );
        } else {
          setGoalTemplates(templates);
        }
      } catch (err) {
        setGoalTemplates([]);
      }
    }

    fetchGoalTemplates();
  }, [selectedGrants]);

  return goalTemplates;
}
