import { REPORT_STATUSES } from '@ttahub/common';
import { ActivityReport, ActivityReportApprover, sequelize, User } from '../models';
import { archiveNotificationsOnActivityReportApproved } from './notifications/activityReport';

/**
 * Wraps an approver mutation (`fn`) in a transaction that snapshots the activity report's
 * calculatedStatus before and after running it, archiving the in-app notifications that
 * become obsolete on approval when the mutation causes the report to transition into
 * APPROVED status.
 *
 * `syncApprovers` runs on every report save, including drafts, so this only takes a
 * `FOR UPDATE` row lock -- and only checks for a transition at all -- when the report is
 * actually SUBMITTED. Otherwise it short-circuits and just runs `fn`, mirroring the bail-out
 * condition the model hook itself already used.
 *
 * This runs under Sequelize's CLS (see `src/models/index.js`), so calling this from inside an
 * existing transaction opens a SAVEPOINT rather than a new top-level transaction, and any
 * queries `fn` issues without an explicit `transaction` option still participate in it. The
 * row lock serializes concurrent approvers reviewing the same report so each transition is
 * observed by exactly one caller.
 *
 * @param {number|string} activityReportId
 * @param {() => Promise<*>} fn
 * @returns {Promise<*>}
 */
async function withApprovalTransition(activityReportId, fn) {
  return sequelize.transaction(async (transaction) => {
    const report = await ActivityReport.findByPk(activityReportId, {
      attributes: ['id', 'submissionStatus', 'calculatedStatus'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!report || report.submissionStatus !== REPORT_STATUSES.SUBMITTED) {
      return fn();
    }

    const before = report.calculatedStatus;
    const result = await fn();

    const after = await ActivityReport.findByPk(activityReportId, {
      attributes: ['calculatedStatus'],
      transaction,
    });

    if (
      after &&
      after.calculatedStatus === REPORT_STATUSES.APPROVED &&
      before !== REPORT_STATUSES.APPROVED
    ) {
      await archiveNotificationsOnActivityReportApproved(Number(activityReportId));
    }

    return result;
  });
}

/**
 * Update or create new Approver
 *
 * @param {*} values - object containing Approver properties to create or update
 */
async function upsertApproverInternal(values) {
  const { activityReportId, userId, status, note } = values;

  let approver = await ActivityReportApprover.findOne({
    where: {
      activityReportId,
      userId,
    },
    paranoid: false,
  });

  if (approver) {
    // we always want to recalculate updatedAt
    // so we trigger the hooks, since we are no longer
    // using upsert
    approver.changed('updatedAt', true);
    approver.set('updatedAt', new Date());

    if (status) {
      approver.set('status', status);
    }

    if (note) {
      approver.set('note', values.note);
    }

    await approver.save({
      individualHooks: true,
    });
  }

  if (!approver) {
    approver = await ActivityReportApprover.create(values, { individualHooks: true });
  }

  // If soft deleted record, restore instead.
  if (approver.deletedAt) {
    return ActivityReportApprover.restore({
      where: { id: approver.id },
      individualHooks: true,
    });
  }

  approver = approver.get({ plain: true });
  const user = await User.findOne({
    attributes: ['email', 'name', 'fullName'],
    where: { id: approver.userId },
  });
  if (user) {
    approver.user = user.get({ plain: true });
  }

  return approver;
}

/**
 * Update or create new Approver. Wraps `upsertApproverInternal` so that an approval that
 * completes a report's approval chain archives the notifications that are obsolete once the
 * report is APPROVED.
 *
 * @param {*} values - object containing Approver properties to create or update
 */
export async function upsertApprover(values) {
  return withApprovalTransition(values.activityReportId, () => upsertApproverInternal(values));
}

/**
 * Determine which Approvers to delete, add or restore
 *
 * @param {*} activityReportId - pk of ActivityReport, used to find ActivityReportApprovers
 * @param {*} userIds - array of userIds for approver records, ActivityReportApprovers will be
 * deleted or created to match this list
 */
async function syncApproversInternal(activityReportId, userIds = []) {
  const preexistingApprovers = await ActivityReportApprover.findAll({
    where: { activityReportId },
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
    const upsertApproverPromises = userIds.map(async (userId) =>
      upsertApproverInternal({
        activityReportId,
        userId,
      })
    );
    await Promise.all(upsertApproverPromises);
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
  });
}

/**
 * Determine which Approvers to delete, add or restore. Wraps `syncApproversInternal` in a
 * single approval-transition snapshot so that a destroy that completes a report's approval
 * (an approver being removed can leave the remaining approvers all APPROVED) also archives
 * the obsolete notifications -- a gap the previous model-hook-only archival left open.
 *
 * @param {*} activityReportId - pk of ActivityReport, used to find ActivityReportApprovers
 * @param {*} userIds - array of userIds for approver records, ActivityReportApprovers will be
 * deleted or created to match this list
 */
export async function syncApprovers(activityReportId, userIds = []) {
  return withApprovalTransition(activityReportId, () =>
    syncApproversInternal(activityReportId, userIds)
  );
}
