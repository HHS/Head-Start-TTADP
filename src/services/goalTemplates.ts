/* eslint-disable import/prefer-default-export */
import { Sequelize, Op } from 'sequelize';
import db from '../models';
import { CURATED_CREATION, GOAL_STATUS } from '../constants';

const {
  GoalTemplate: GoalTemplateModel,
  Grant,
} = db;

interface GoalTemplate {
  id: number;
  label: string;
  value: number;
  name: string;
  goalIds: number[];
  isRttapa: string;
  status: string;
  endDate: string | null;
  grantIds: [];
  oldGrantIds: [];
  onApprovedAR: true;
  isNew: false;
}

export async function getCuratedTemplates(grantIds: number[] | null): Promise<GoalTemplate[]> {
  // Collect the distinct list of regionIds from the list of passed grantIds
  const regionIds = grantIds && grantIds.length
    ? await Grant.scope().findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('regionId')), 'regionId'],
      ],
      where: { id: grantIds },
      raw: true,
    })
    : [];

  // Collect all the templates that either have a null regionId or a regionId from the list
  // collected above.
  return GoalTemplateModel.findAll({
    attributes: [
      'id',
      ['templateName', 'label'],
      ['id', 'value'],
      ['templateName', 'name'],
      [Sequelize.literal('ARRAY[]::int[]'), 'goalIds'],
      [Sequelize.literal('NULL::varchar'), 'isRttapa'],
      [Sequelize.literal(`'${GOAL_STATUS.NOT_STARTED}'`), 'status'],
      [Sequelize.literal('NULL::varchar'), 'endDate'],
      [Sequelize.literal('ARRAY[]::int[]'), 'grantIds'],
      [Sequelize.literal('ARRAY[]::int[]'), 'oldGrantIds'],
      [Sequelize.literal('TRUE'), 'onApprovedAR'],
      [Sequelize.literal('FALSE'), 'isNew'],
    ],
    where: {
      creationMethod: CURATED_CREATION,
      [Op.or]: [
        { regionId: regionIds },
        { regionId: null },
      ],
    },
    ORDER: [['name', 'ASC']],
    raw: true,
  });
}
