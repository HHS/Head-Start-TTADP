import db from '../models';

const { CollabReportApprover, User } = db;

/**
 * Update or create new approver
 * @param values Object containing approver properties to create or update
 */
export async function upsertApprover(values) {
  const {
    collabReportId,
    userId,
    status,
    note,
  } = values;

  let approver = await CollabReportApprover.findOne({
    where: {
      collabReportId,
      userId,
    },
    paranoid: false,
  });

  // Update if approver found
  if (approver) {
    // Recalculate updatedAt to trigger hooks
    approver.changed('updatedAt', true);
    approver.set('updatedAt', new Date());

    if (status) approver.set('status', status);

    if (note) approver.set('note', note);

    await approver.save({
      individualHooks: true,
    });
  }

  // Create if no approver found
  if (!approver) {
    approver = await CollabReportApprover.create(
      values,
      { individualHooks: true },
    );
  }

  // If soft deleted record, restore instead
  if (approver.deletedAt) {
    return CollabReportApprover.restore({
      where: { id: approver.id },
      individualHooks: true,
    });
  }

  // Finally, get the complete approver object from the db
  approver = await CollabReportApprover.findOne({
    where: { collabReportId, userId },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'email'],
      raw: true,
    }],
  });

  return approver;
}

/**
 * Determine which Approvers to delete, add or restore
 *
 * @param {number} collabReportId - pk of CollabReport, used to find CollabReportApprovers
 * @param {number[]} approverUserIds - array of userIds for approver records, CollabReportApprovers
 * will be deleted or created to match this list
 */
export async function syncCRApprovers(collabReportId: number, approverUserIds: number[]) {
  const existingApprovers = await CollabReportApprover.findAll({
    where: { collabReportId },
  });

  // Destroy any existing approvers now missing from user Ids
  if (existingApprovers && existingApprovers.length > 0) {
    const approversToDestroy = existingApprovers.filter((a) => !approverUserIds.includes(a.userId));
    const destroyPromises = approversToDestroy.map(async (approver) => {
      // By default, do a soft delete
      let force = false;

      if (!approver.note && !approver.status) {
        // Approver was assigned but never reviewed, so nothing for UI to display;
        // do a hard delete
        force = true;
      }

      return CollabReportApprover.destroy({
        where: { id: approver.id },
        individualHooks: true,
        force,
      });
    });

    await Promise.all(destroyPromises);
  }

  // Create or restore approvers
  if (approverUserIds.length > 0) {
    const upsertApproverPromises = approverUserIds.map(async (userId) => upsertApprover({
      collabReportId,
      userId,
    }));

    await Promise.all(upsertApproverPromises);
  }

  // Finally, return the new list of approvers
  return CollabReportApprover.findAll({
    where: { collabReportId },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'email'],
      raw: true,
    }],
  });
}
