import { Op } from 'sequelize';
import db from '../../models';

const { Goal, sequelize } = db;

export const GOAL_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
  SUSPENDED: 'Suspended',
  DRAFT: 'Draft',
};

const STATUSES_TO_INCLUDE = [
  GOAL_STATUS.NOT_STARTED,
  GOAL_STATUS.IN_PROGRESS,
  GOAL_STATUS.CLOSED,
  GOAL_STATUS.SUSPENDED,
  GOAL_STATUS.DRAFT,
];

interface GoalModel {
  count: number;
  status: string;
}

export default async function goalsByStatus(scopes) {
  const { count: rowsCount, rows: goalsFromDb } = await Goal.findAndCountAll({
    where: {
      [Op.and]: [
        scopes.goal,
      ],
    },
    // BIGINT (type returned from count) gets converted to string. Explicitly set count to int
    attributes: [
      [
        sequelize.cast(sequelize.fn(
          'COUNT',
          sequelize.col('"Goal".id'),
        ), 'int'),
        'count'],
      'status'],
    group: [
      '"Goal".status',
    ],
    raw: true,
  });

  // eslint-disable-next-line max-len
  const total = rowsCount.reduce((accumulator: number, col: { count: number }) => accumulator + col.count, 0) as number;

  const goals = STATUSES_TO_INCLUDE.reduce((accumulator, status) => {
    const goal = goalsFromDb.find((g: GoalModel) => g.status === status);
    const count = goal ? goal.count : 0;

    return { ...accumulator, [status]: count };
  }, {});

  return {
    total,
    'Not started': goals[GOAL_STATUS.NOT_STARTED],
    'In progress': goals[GOAL_STATUS.IN_PROGRESS],
    Suspended: goals[GOAL_STATUS.SUSPENDED],
    Closed: goals[GOAL_STATUS.CLOSED],
    Draft: goals[GOAL_STATUS.DRAFT],
  };
}
