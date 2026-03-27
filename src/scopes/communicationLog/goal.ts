import { sequelize } from '../../models';

const normalizeGoals = (goals: string[]) => goals
  .flatMap((goal) => goal.split(',').map((item) => item.trim()))
  .filter((goal) => goal.length > 0);

const goalLiteral = (goals: string[], exclude = false) => {
  const normalizedGoals = normalizeGoals(goals);

  if (!normalizedGoals.length) {
    return {};
  }

  const escapedLabels = normalizedGoals.map((goal) => sequelize.escape(goal));
  const query = escapedLabels.length
    ? `goal->>'label' IN (${escapedLabels.join(', ')})`
    : '';

  return sequelize.literal(`
    ${exclude ? 'NOT ' : ''}EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE("CommunicationLog"."data"->'goals', '[]'::jsonb)) AS goal
      WHERE ${query}
    )
  `);
};

export function withGoal(goals: string[]) {
  return goalLiteral(goals, false);
}

export function withoutGoal(goals: string[]) {
  return goalLiteral(goals, true);
}
