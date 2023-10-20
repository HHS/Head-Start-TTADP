import { Op } from 'sequelize';
import db from '../../models';
import {
  RemappingDefinition,
  collectChangedValues,
  filterDataToModel,
  includeToFindAll,
  remap,
} from '../../lib/modelUtils';
import { includeGoalFieldResponses, syncGoalFieldResponses } from './goalFieldResponse';
import { includeGoalResources, syncGoalResources } from './goalResource';
import { includeObjectives, syncObjectives } from './objective';
import { GOAL_STATUS } from '../../constants';

const {
  Goal,
} = db;

const syncGoals = async (
  data,
) => {
  const [
    filteredData,
    existingGoals,
  ] = await Promise.all([
    Promise.all(data.map(async (datum) => filterDataToModel(datum, Goal))),
    Goal.findAll({
      where: {
        [Op.or]: data.map((datum) => ({
          grantId: datum.grantId,
          ...(datum.id && { id: datum.id }),
          ...(datum.goalTemplateId && { goalTemplateId: datum.goalTemplateId }),
          ...(!datum.id && datum.name && { name: datum.name }),
        })),
        status: { [Op.not]: GOAL_STATUS.CLOSED },
      },
      raw: true,
    }),
  ]);

  const [
    createList,
    updateList,
  ] = [
    filteredData
      .filter(({ mapped }) => !existingGoals.includes((eg) => (
        mapped?.id === eg.id
        || (mapped.grantId === eg.grantId
          && (mapped.goaltemplateId === eg.goalTemplateId
          || mapped.name === eg.name))
      )))
      .map(({ mapped }) => mapped),
    filteredData
      .reduce((acc, { mapped }) => {
        const match = existingGoals.find((eg) => (
          mapped?.id === eg.id
          || (mapped.grantId === eg.grantId
            && (mapped.goaltemplateId === eg.goalTemplateId
              || mapped.name === eg.name))
        ));

        if (match) {
          acc.push({
            id: match.id,
            ...collectChangedValues(
              mapped,
              match,
            ),
          });
        }

        return acc;
      }, []),
  ];

  const [
    newGoals,
    updatedGoals,
  ] = await Promise.all([
    Goal.bulkCreate(
      createList,
      {
        individualHooks: true,
        returning: [
          'id',
          'name',
          'grant',
          'goalTemplateId',
        ],
      },
    ),
    Promise.all(updateList.map(async ({ id, ulFields }) => Goal.update(
      ulFields,
      {
        where: { id },
        individualHooks: true,
        returning: [
          'id',
          'name',
          'grant',
          'goalTemplateId',
        ],
      },
    ))),
  ]);

  const effectedGoals = [
    ...newGoals,
    ...updatedGoals,
  ];

  const linkedBackData = effectedGoals
    .reduce((acc, eg) => {
      const fd = filteredData.find((datum) => (
        eg.id === datum.mapped?.id
        || (eg.grantId === datum.mapped.grantId
          && (eg.goalTemplateId === datum.mapped?.goalTemplateId
            || eg.name === datum.mapped?.name))
      ));

      if (fd) {
        acc.push({
          ...eg,
          unmapped: fd.unmapped,
        });
      }

      return acc;
    }, []);
  const [
    goalFieldResponsesList,
    goalResourcesList,
    objectives,
  ] = [
    linkedBackData
      .filter((lbd) => lbd.unmapped.goalFieldResponses
        && lbd.unmapped.goalFieldResponses.length > 0)
      .map((lbd) => lbd.unmapped.goalFieldResponses
        .map((gfr) => ({ goalId: lbd.id, ...gfr }))),
    linkedBackData
      .filter((lbd) => lbd.unmapped.goalResources
        && lbd.unmapped.goalResources.length > 0)
      .map((lbd) => lbd.unmapped.goalResources
        .map((gr) => ({ goalId: lbd.id, ...gr }))),
    linkedBackData
      .filter((lbd) => lbd.unmapped.objectives
        && lbd.unmapped.objectives.length > 0)
      .map((lbd) => lbd.unmapped.objectives
        .map((o) => ({ goalId: lbd.id, ...o }))),
  ];

  return {
    promises: Promise.all([
      goalFieldResponsesList && goalFieldResponsesList.length > 0
        ? syncGoalFieldResponses(goalFieldResponsesList)
        : Promise.resolve(),
      goalResourcesList && goalResourcesList.length > 0
        ? syncGoalResources(goalResourcesList)
        : Promise.resolve(),
      objectives && objectives.length > 0
        ? syncObjectives(objectives)
        : Promise.resolve(),
    ]),
    unmapped: linkedBackData.map((lbd) => lbd.unmapped),
  };
};

const includeGoals = (
  options,
) => ({
  model: Goal,
  as: 'goals',
  required: false,
  attributes: [],
  include: [
    includeGoalFieldResponses(),
    includeGoalResources(),
    ...((options?.includes?.objectives || true)
      && [includeObjectives(options)]),
  ],
});

// TODO: we need any additional filters or scopes?
const getGoals = async (
  goalIds?: number[],
) => includeToFindAll(
  includeGoals,
  {
    ...(goalIds && goalIds.length > 0 && { id: goalIds }),
  },
);

export {
  syncGoals,
  includeGoals,
  getGoals,
};
