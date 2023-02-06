export const matchPhraseQuery = (fields, query) => {
  if (fields && fields.length) {
    return fields.map((field) => {
      if (field === 'context') {
        return ({ match_phrase: { context: { slop: 0, query } } });
      }
      if (field === 'nonECLKCResources') {
        return ({ match_phrase: { nonECLKCResources: { slop: 0, query } } });
      }
      if (field === 'ECLKCResources') {
        return ({ match_phrase: { ECLKCResources: { slop: 0, query } } });
      }
      if (field === 'recipientNextSteps') {
        return ({ match_phrase: { recipientNextSteps: { slop: 0, query } } });
      }
      if (field === 'specialistNextSteps') {
        return ({ match_phrase: { specialistNextSteps: { slop: 0, query } } });
      }
      if (field === 'activityReportGoals') {
        return ({ match_phrase: { activityReportGoals: { slop: 0, query } } });
      }
      if (field === 'activityReportObjectives') {
        return ({ match_phrase: { activityReportObjectives: { slop: 0, query } } });
      }
      if (field === 'activityReportObjectivesTTA') {
        return ({ match_phrase: { activityReportObjectivesTTA: { slop: 0, query } } });
      }
      if (field === 'activityReportObjectiveResources') {
        return ({ match_phrase: { activityReportObjectiveResources: { slop: 0, query } } });
      }
      return null;
    });
  }

  return ([
    { match_phrase: { context: { slop: 0, query } } },
    { match_phrase: { nonECLKCResources: { slop: 0, query } } },
    { match_phrase: { ECLKCResources: { slop: 0, query } } },
    { match_phrase: { recipientNextSteps: { slop: 0, query } } },
    { match_phrase: { specialistNextSteps: { slop: 0, query } } },
    { match_phrase: { activityReportGoals: { slop: 0, query } } },
    { match_phrase: { activityReportObjectives: { slop: 0, query } } },
    { match_phrase: { activityReportObjectivesTTA: { slop: 0, query } } },
    { match_phrase: { activityReportObjectiveResources: { slop: 0, query } } },
  ]);
};

export const wildCardQuery = (fields, query) => {
  const queryWithWildCard = `*${query}*`;
  if (fields && fields.length) {
    return fields.map((field) => {
      if (field === 'context') {
        return ({ wildcard: { context: queryWithWildCard } });
      }
      if (field === 'nonECLKCResources') {
        return ({ wildcard: { nonECLKCResources: queryWithWildCard } });
      }
      if (field === 'ECLKCResources') {
        return ({ wildcard: { ECLKCResources: queryWithWildCard } });
      }
      if (field === 'recipientNextSteps') {
        return ({ wildcard: { recipientNextSteps: queryWithWildCard } });
      }
      if (field === 'specialistNextSteps') {
        return ({ wildcard: { specialistNextSteps: queryWithWildCard } });
      }
      if (field === 'activityReportGoals') {
        return ({ wildcard: { activityReportGoals: queryWithWildCard } });
      }
      if (field === 'activityReportObjectives') {
        return ({ wildcard: { activityReportObjectives: queryWithWildCard } });
      }
      if (field === 'activityReportObjectivesTTA') {
        return ({ wildcard: { activityReportObjectivesTTA: queryWithWildCard } });
      }
      if (field === 'activityReportObjectiveResources') {
        return ({ wildcard: { activityReportObjectiveResources: queryWithWildCard } });
      }
      return null;
    });
  }

  return ([
    { wildcard: { context: queryWithWildCard } },
    { wildcard: { nonECLKCResources: queryWithWildCard } },
    { wildcard: { ECLKCResources: queryWithWildCard } },
    { wildcard: { recipientNextSteps: queryWithWildCard } },
    { wildcard: { specialistNextSteps: queryWithWildCard } },
    { wildcard: { activityReportGoals: queryWithWildCard } },
    { wildcard: { activityReportObjectives: queryWithWildCard } },
    { wildcard: { activityReportObjectivesTTA: queryWithWildCard } },
    { wildcard: { activityReportObjectiveResources: queryWithWildCard } },
  ]);
};
