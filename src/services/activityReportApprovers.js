import { ActivityReportApprover, User } from '../models'

/**
 * Update or create new Approver
 *
 * @param {*} values - object containing Approver properties to create or update
 */
export async function upsertApprover(values) {
  const { activityReportId, userId, status, note } = values

  let approver = await ActivityReportApprover.findOne({
    where: {
      activityReportId,
      userId,
    },
    paranoid: false,
  })

  if (approver) {
    // we always want to recalculate updatedAt
    // so we trigger the hooks, since we are no longer
    // using upsert
    approver.changed('updatedAt', true)
    approver.set('updatedAt', new Date())

    if (status) {
      approver.set('status', status)
    }

    if (note) {
      approver.set('note', values.note)
    }

    await approver.save({
      individualHooks: true,
    })
  }

  if (!approver) {
    approver = await ActivityReportApprover.create(values, { individualHooks: true })
  }

  // If soft deleted record, restore instead.
  if (approver.deletedAt) {
    return ActivityReportApprover.restore({
      where: { id: approver.id },
      individualHooks: true,
    })
  }

  approver = approver.get({ plain: true })
  const user = await User.findOne({
    attributes: ['email', 'name', 'fullName'],
    where: { id: approver.userId },
  })
  if (user) {
    approver.user = user.get({ plain: true })
  }

  return approver
}

/**
 * Determine which Approvers to delete, add or restore
 *
 * @param {*} activityReportId - pk of ActivityReport, used to find ActivityReportApprovers
 * @param {*} userIds - array of userIds for approver records, ActivityReportApprovers will be
 * deleted or created to match this list
 */
export async function syncApprovers(activityReportId, userIds = []) {
  const preexistingApprovers = await ActivityReportApprover.findAll({
    where: { activityReportId },
  })

  // Destroy any preexisting approvers now missing from userId request param
  if (preexistingApprovers && preexistingApprovers.length > 0) {
    const approversToDestroy = preexistingApprovers.filter((a) => !userIds.includes(a.userId))
    const destroyPromises = approversToDestroy.map(async (approver) => {
      if (!approver.note && !approver.status) {
        // Approver was assigned never reviewed, nothing for UI
        // to display, do a true delete
        return ActivityReportApprover.destroy({
          where: { id: approver.id },
          individualHooks: true,
          force: true,
        })
      }
      // Approver had reviewed the report, soft delete
      // so we can still display status and note
      return ActivityReportApprover.destroy({
        where: { id: approver.id },
        individualHooks: true,
      })
    })
    await Promise.all(destroyPromises)
  }

  // Create or restore approvers
  if (userIds.length > 0) {
    const upsertApproverPromises = userIds.map(async (userId) =>
      upsertApprover({
        activityReportId,
        userId,
      })
    )
    await Promise.all(upsertApproverPromises)
  }

  return ActivityReportApprover.findAll({
    where: { activityReportId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
        raw: true,
      },
    ],
  })
}
