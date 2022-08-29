import { Op } from 'sequelize';
import {
  Goal, Grant, Recipient, sequelize,
} from '../models';

export const GOAL_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
  SUSPENDED: 'Suspended',
  COMPLETED: 'Completed',
  DRAFT: 'Draft',
};

const STATUSES_TO_INCLUDE = [
  GOAL_STATUS.NOT_STARTED,
  GOAL_STATUS.IN_PROGRESS,
  GOAL_STATUS.CLOSED,
  GOAL_STATUS.SUSPENDED,
  GOAL_STATUS.COMPLETED,
];

export default async function goalStatusGraph(scopes) {
  const goalsFromDb = await Goal.findAll({
    where: {
      [Op.and]: [
        scopes.goal,
        {
          status: {
            [Op.in]: STATUSES_TO_INCLUDE,
          },
        },
      ],
    },
    // BIGINT (type returned from count) gets converted to string. Explicitly set count to int
    attributes: [
      [
        sequelize.cast(sequelize.fn(
          'COUNT',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn('TRIM', sequelize.col('"Goal".name')),
          ),
        ), 'int'),
        'count'],
      'status'],
    group: [
      '"Goal".status',
    ],
    includeIgnoreAttributes: false,
    raw: true,
    include: [{
      model: Grant,
      as: 'grant',
      required: true,
      include: [{
        model: Recipient,
        as: 'recipient',
        required: true,
      }],
    }],
  });

  let total = 0;

  const goals = STATUSES_TO_INCLUDE.reduce((accumulator, status) => {
    const goal = goalsFromDb.find((g) => g.status === status);
    const count = goal ? goal.count : 0;
    total += count;
    return { ...accumulator, [status]: count };
  }, {});

  return {
    total,
    'Not started': goals[GOAL_STATUS.NOT_STARTED],
    'In progress': goals[GOAL_STATUS.IN_PROGRESS],
    Suspended: goals[GOAL_STATUS.SUSPENDED],
    Closed: goals[GOAL_STATUS.CLOSED] + goals[GOAL_STATUS.COMPLETED],
  };
}
