const responsesForComparison = (g) => (g.responses || [])
  .map((gfr) => gfr.response).sort().join();

const goalFieldTransate = {
  name: 'goalText',
  status: 'goalStatus',
  source: 'source',
  responsesForComparison: 'responsesForComparison',
};

const findOrFailExistingGoal = (needle, haystack, translate = goalFieldTransate) => {
  const needleCollaborators = (needle.collaborators || []).map(
    (c) => c.goalCreatorName,
  ).filter(Boolean);

  return haystack.find((g) => {
    const haystackCollaborators = (g.collaborators || [])
      .map((c) => c.goalCreatorName).filter(Boolean);

    return (
      g[translate.status] === needle.status
        && g[translate.name].trim() === needle.name.trim()
        && g[translate.source] === needle.source
        && g.isFei === needle.dataValues.isFei
        && g[translate.responsesForComparison] === responsesForComparison(needle)
        && (
          (needleCollaborators.length === 0 && haystackCollaborators.length === 0)
          || haystackCollaborators
            .some((collaborator) => needleCollaborators.includes(collaborator))
        )
    );
  });
};

export {
  findOrFailExistingGoal,
  responsesForComparison,
  goalFieldTransate,
};
