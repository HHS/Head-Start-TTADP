import db from '../models';

const {
  Goal, Grant, GoalFieldResponse, Recipient,
} = db;

export default async function getGoalsMissingDataForActivityReportSubmission(goalIds: number[]) {
  const goals = await Goal.findAll({
    attributes: ['id'],
    where: {
      id: goalIds,
    },
    include: [
      {
        model: GoalFieldResponse,
        as: 'responses',
        required: false,
        attributes: ['response', 'goalId'],
      },
      {
        model: Grant,
        as: 'grant',
        attributes: ['regionId', 'id'],
        required: true,
        include: [{
          model: Recipient,
          required: true,
          as: 'recipient',
          attributes: ['id'],
        }],
      },
    ],
  }) as Array<{
    id: number;
    responses: Array<{
      response: string;
      goalId: number;
    }>;
    grant: {
      regionId: number;
      recipient: {
        id: number;
      };
      id: number;
    };
  }>;

  return goals.filter((goal) => !goal.responses.length).map((goal) => ({
    id: goal.id,
    recipientId: goal.grant.recipient.id,
    regionId: goal.grant.regionId,
  }));
}
