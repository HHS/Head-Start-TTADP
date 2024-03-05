const responsesForComparison = (g) => (g.responses || [])
  .map((gfr) => gfr.response).sort().join();

const goalFieldTransate = {
  name: 'goalText',
  status: 'goalStatus',
  source: 'source',
  responsesForComparison: 'responsesForComparison',
};

const findOrFailExistingGoal = (needle, haystack, translate = goalFieldTransate) => {
  const needleCollaborators = needle?.collaborators?.map(
    (c) => c.goalCreatorName,
  ).filter(Boolean) ?? [];

  const haystackCollaborators = haystack.flatMap(
    (g) => g.collaborators.map((c) => c.goalCreatorName).filter(Boolean),
  );

  return haystack.find((g) => (
    g[translate.status] === needle.status
    && g[translate.name].trim() === needle.name.trim()
    && g[translate.source] === needle.source
    && g[translate.responsesForComparison] === responsesForComparison(needle)
    && haystackCollaborators.some((c) => needleCollaborators.includes(c))
  ));
};

export {
  findOrFailExistingGoal,
  responsesForComparison,
  goalFieldTransate,
};
