import { ActivityReportApprover, User } from '../models';

/**
 * Update or create new Approver
 *
 * @param {*} values - object containing Approver properties to create or update
 * @param {*} transaction - sequelize transaction
 */
export async function upsertApprover(values, transaction) {
  // Create approver, on unique constraint violation do update
  let [approver] = await ActivityReportApprover.upsert(values, {
    transaction,
    returning: true,
  });

  // Upsert returns null when trying to upsert soft deleted record.
  // If soft deleted record, restore instead.
  if (approver.deletedAt) {
    return ActivityReportApprover.restore({
      where: values,
      transaction,
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
 * @param {*} transaction - sequelize transaction
 */
export async function syncApprovers(activityReportId, userIds = [], transaction = null) {
  const preexistingApprovers = await ActivityReportApprover.findAll({
    where: { activityReportId },
    transaction,
  });

  // Destroy any preexisting approvers now missing from userId request param
  if (preexistingApprovers && preexistingApprovers.length > 0) {
    const approversToDestroy = preexistingApprovers.filter((a) => !userIds.includes(a.userId));
    const destroyPromises = approversToDestroy.map(async (approver) => {
      if (!approver.note && !approver.status) {
        // Approver was assigned never reviewed, nothing for UI
        // to display, do a true delete
        return ActivityReportApprover.destroy({
          where: { id: approver.id },
          individualHooks: true,
          force: true,
          transaction,
        });
      }
      // Approver had reviewed the report, soft delete
      // so we can still display status and note
      return ActivityReportApprover.destroy({
        where: { id: approver.id },
        individualHooks: true,
        transaction,
      });
    });
    await Promise.all(destroyPromises);
  }

  // Create or restore approvers
  if (userIds.length > 0) {
    const upsertApproverPromises = userIds.map(async (userId) => upsertApprover({
      activityReportId,
      userId,
    }, transaction));
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
    transaction,
  });
}
