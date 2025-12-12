import { validateChangedOrSetEnums } from '../helpers/enum';
import { OBJECTIVE_COLLABORATORS } from '../../constants';
import {
  currentUserPopulateCollaboratorForType,
  removeCollaboratorsForType,
} from '../helpers/genericCollaborator';

const propagateDestroyToMetadata = async (sequelize, instance, options) => Promise.all(
  [
    sequelize.models.ActivityReportObjectiveFile,
    sequelize.models.ActivityReportObjectiveResource,
    sequelize.models.ActivityReportObjectiveTopic,
    sequelize.models.ActivityReportObjectiveCourse,
    sequelize.models.ActivityReportObjectiveCitation,
  ].map(async (model) => model.destroy({
    where: {
      activityReportObjectiveId: instance.id,
    },
    individualHooks: true,
    hookMetadata: { objectiveId: instance.objectiveId },
    transaction: options.transaction,
  })),
);

const recalculateOnAR = async (sequelize, instance, options) => {
  await sequelize.query(`
    WITH
      "ObjectiveOnReport" AS (
        SELECT
          o."id",
          COUNT(aro.id) > 0 "onAR"
        FROM "Objectives" o
        LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
        WHERE o."id" = ${instance.objectiveId}
        GROUP BY o."id"
      )
    UPDATE "Objectives" o
    SET "onAR" = "oor"."onAR"
    FROM "ObjectiveOnReport" oor
    WHERE o.id = oor.id;
  `, { transaction: options.transaction });
};

const autoPopulateLinker = async (sequelize, instance, options) => {
  const { objectiveId, activityReportId } = instance;
  return currentUserPopulateCollaboratorForType(
    'objective',
    sequelize,
    options.transaction,
    objectiveId,
    OBJECTIVE_COLLABORATORS.LINKER,
    { activityReportIds: [activityReportId] },
  );
};

const autoCleanupLinker = async (sequelize, instance, options) => {
  const { objectiveId, activityReportId } = instance;
  return removeCollaboratorsForType(
    'objective',
    sequelize,
    options.transaction,
    objectiveId,
    OBJECTIVE_COLLABORATORS.LINKER,
    { activityReportIds: [activityReportId] },
  );
};

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateLinker(sequelize, instance, options);
  await recalculateOnAR(sequelize, instance, options);
};

const beforeValidate = async (sequelize, instance, options) => {
  validateChangedOrSetEnums(sequelize, instance);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToMetadata(sequelize, instance, options);
  await autoCleanupLinker(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  propagateDestroyToMetadata,
  recalculateOnAR,
  afterCreate,
  beforeValidate,
  beforeDestroy,
  afterDestroy,
};
