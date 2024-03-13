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
        attributes: ['regionId', 'id', 'number'],
        required: true,
        include: [{
          model: Recipient,
          required: true,
          as: 'recipient',
          attributes: ['id', 'name'],
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
      number: string;
      recipient: {
        id: number;
        name: string;
      };
      id: number;
    };
  }>;

  return goals.filter((goal) => !goal.responses.length).map((goal) => ({
    id: goal.id,
    recipientId: goal.grant.recipient.id,
    regionId: goal.grant.regionId,
    grantNumber: goal.grant.number,
    recipientName: goal.grant.recipient.name,
  }));
}
