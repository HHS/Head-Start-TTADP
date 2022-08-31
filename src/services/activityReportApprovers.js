import { Op } from 'sequelize';
import { ActivityReportApprover, User, Collaborators } from '../models';
import { ENTITY_TYPES, COLLABORATOR_TYPES } from '../constants';

/**
 * Update or create new Approver
 *
 * @param {*} values - object containing Approver properties to create or update
 */
export async function upsertApprover(values) {
  // Create approver, on unique constraint violation do update
  let [approver] = await ActivityReportApprover.upsert(values, {
    returning: true,
  });

  // Upsert returns null when trying to upsert soft deleted record.
  // If soft deleted record, restore instead.
  if (approver.deletedAt) {
    return ActivityReportApprover.restore({
      where: values,
      individualHooks: true,
    });
  }

  if (approver) {
    approver = approver.get({ plain: true });
    const user = await User.findOne({
      attributes: ['email', 'name', 'fullName'],
      where: { id: approver.userId },
    });
    if (user) {
      approver.User = user.get({ plain: true });
    }
  }

  return approver;
}

/**
 * Determine which Approvers to delete, add or restore
 *
 * @param {*} activityReportId - pk of ActivityReport, used to find ActivityReportApprovers
 * @param {*} userIds - array of userIds for approver records, ActivityReportApprovers will be
 * deleted or created to match this list
 */
export async function syncApprovers(activityReportId, userIds = [], tier = 1) {
  const preexistingApprovers = await Collaborators.findAll({
    where: {
      entityType: ENTITY_TYPES.REPORT,
      entityId: activityReportId,
      tier,
      collaboratorTypes: { [Op.contains]: COLLABORATOR_TYPES.RATIFIER },
    },
  });

  // Destroy any preexisting approvers now missing from userId request param
  if (preexistingApprovers && preexistingApprovers.length > 0) {
    const approversToDestroy = preexistingApprovers.filter((a) => !userIds.includes(a.userId));
    const destroyPromises = approversToDestroy.map(async (approver) => {
      if (!approver.note && !approver.status) {
        // Approver was assigned never reviewed, nothing for UI
        // to display, do a true delete
        return Collaborators.update({
          collaboratorTypes: approver.collaboratorTypes
            .filter((type) => type !== COLLABORATOR_TYPES.RATIFIER),
        }, {
          where: { id: approver.id },
        });
      }
      // Approver had reviewed the report, soft delete
      // so we can still display status and note
      return ActivityReportApprover.destroy({
        where: { id: approver.id },
        individualHooks: true,
      });
    });
    await Promise.all(destroyPromises);
  }

  // Create or restore approvers
  if (userIds.length > 0) {
    const upsertApproverPromises = userIds.map(async (userId) => upsertApprover({
      activityReportId,
      userId,
    }));
    await Promise.all(upsertApproverPromises);
  }

  return ActivityReportApprover.findAll({
    where: { activityReportId },
    include: [
      {
        model: User,
        attributes: ['id', 'name', 'email'],
        raw: true,
      },
    ],
  });
}
