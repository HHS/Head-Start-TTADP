/* eslint-disable import/prefer-default-export */
import express, { Response, Request } from 'express';
import { DECIMAL_BASE } from '@ttahub/common';
import db from '../../models';
import transactionWrapper from '../transactionWrapper';
import { handleError } from '../../lib/apiErrorHandler';
import { checkReportIdParam } from '../../middleware/checkIdParamMiddleware';
import { synchonizeUserDataOnLegacyReports } from '../../services/activityReports';

const namespace = 'ADMIN:LEGACY-REPORTS';
const logContext = { namespace };

const {
  ActivityReport,
  User,
  ActivityReportCollaborator,
  ActivityReportApprover,
} = db;

/**
 *
 * @param {Request} req - request
 * @param {Response} res - response
 */

export async function updateAllLegacyReportUsers(req: Request, res: Response) {
  try {
    await synchonizeUserDataOnLegacyReports();
    res.status(200).json({ message: 'All legacy reports updated successfully' });
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}

/**
   *
   * @description Updates the createdBy, modifiedBy, and manager fields of a legacy report
   *
   * @param {Request} req - request
   * @param {Response} res - response
   */
export async function updateLegacyReportUsers(req: Request, res: Response) {
  // admin access is already checked in the middleware
  // we also confirm the reportId param is valid in the middleware
  try {
    const reportId = parseInt(req.params.reportId, DECIMAL_BASE);
    const data = req.body;
    const { createdBy, modifiedBy, manager } = data;

    const report = await ActivityReport.findByPk(reportId);

    const messages = [
      'Report updated successfully',
    ];

    if (!report) {
      throw new Error('Report not found');
    }

    const { imported } = report;

    report.set('imported', {
      ...imported,
      createdBy,
      modifiedBy,
      manager,
    });

    const promises = [];

    if (createdBy) {
      const creator = await User.findOne({
        attributes: ['id', 'email'],
        where: {
          email: createdBy.trim(),
        },
      });

      if (!creator) {
        messages.push(`User with email ${createdBy} not found. Report author not updated.`);
      } else {
        report.set('userId', creator.id);
      }
    }
    if (modifiedBy) {
      const collaborator = await User.findOne({
        attributes: ['id', 'email'],
        where: {
          email: modifiedBy.trim(),
        },
      });

      if (!collaborator) {
        messages.push(`User with email ${modifiedBy} not found. Report collaborator not added.`);
      } else {
        promises.push(ActivityReportCollaborator.findOrCreate({
          where: {
            activityReportId: report.id,
            userId: collaborator.id,
          },
        }));
      }
    }
    if (manager) {
      const approver = await User.findOne({
        attributes: ['id', 'email'],
        where: {
          email: manager.trim(),
        },
      });

      if (!approver) {
        messages.push(`User with email ${manager} not found. Report approver not added.`);
      } else {
        promises.push(ActivityReportApprover.findOrCreate({
          where: {
            activityReportId: report.id,
            userId: approver.id,
          },
        }));
      }
    }

    promises.push(report.save());
    await Promise.all(promises);

    res.status(200).json({ messages });
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}

const router = express.Router();

router.post('/users', transactionWrapper(synchonizeUserDataOnLegacyReports));
router.put('/:reportId/users', checkReportIdParam, transactionWrapper(updateLegacyReportUsers));

export default router;
