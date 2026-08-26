import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { getGoalTemplates } from '../fetchers/goalTemplates';

export default function useGoalTemplates(selectedGrants, options = {}) {
  const {
    filterOutUsedTemplates = false,
    includeBlockingActivityReports = false,
    includeClosedSuspendedGoals = false,
  } = options;
  const [goalTemplates, setGoalTemplates] = useState(null);

  // using DeepCompareEffect to avoid unnecessary fetches
  // as we have an object (selectedGrant) in the dependency array
  useDeepCompareEffect(() => {
    let isCurrentRequest = true;

    async function fetchGoalTemplates() {
      try {
        const grantIds = selectedGrants.map((grant) => grant?.id).filter(Boolean);
        if (selectedGrants.length > 0 && grantIds.length === 0) {
          if (isCurrentRequest) {
            setGoalTemplates(null);
          }
          return;
        }
        const templates = await getGoalTemplates(grantIds, {
          includeBlockingActivityReports,
          includeClosedSuspendedGoals,
        });
        if (!isCurrentRequest) {
          return;
        }
        if (filterOutUsedTemplates) {
          // We want all templates that either have no goals or have goals but all of them
          // are prestandard (to allow the re-use of the template for a new standard goal from RTR).
          const filtered = templates.filter(
            (template) =>
              template.blockingActivityReports?.length > 0 ||
              !template.goals ||
              template.goals.every((goal) => goal.prestandard === true)
          );
          setGoalTemplates(filtered);
        } else {
          setGoalTemplates(templates);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setGoalTemplates([]);
        }
      }
    }

    fetchGoalTemplates();
    return () => {
      isCurrentRequest = false;
    };
  }, [
    selectedGrants,
    filterOutUsedTemplates,
    includeBlockingActivityReports,
    includeClosedSuspendedGoals,
  ]);

  return goalTemplates;
}
