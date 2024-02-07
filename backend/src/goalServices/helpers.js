const responsesForComparison = (g) => (g.responses || [])
  .map((gfr) => gfr.response).sort().join();

const goalFieldTransate = {
  name: 'goalText',
  status: 'goalStatus',
  source: 'source',
  responsesForComparison: 'responsesForComparison',
};

const findOrFailExistingGoal = (needle, haystack, translate = goalFieldTransate) => haystack.find(
  (g) => g[translate.status] === needle.status
      && g[translate.name].trim() === needle.name.trim()
      && g[translate.source] === needle.source
      && g[translate.responsesForComparison] === responsesForComparison(needle),
);

export {
  findOrFailExistingGoal,
  responsesForComparison,
  goalFieldTransate,
};
