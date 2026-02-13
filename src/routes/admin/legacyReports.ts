/* eslint-disable import/prefer-default-export */
import express, { type Response, type Request } from 'express'
import { Op } from 'sequelize'
import httpCodes from 'http-codes'
import { DECIMAL_BASE } from '@ttahub/common'
import db from '../../models'
import transactionWrapper from '../transactionWrapper'
import { handleError } from '../../lib/apiErrorHandler'
import { checkReportIdParam } from '../../middleware/checkIdParamMiddleware'

const namespace = 'ADMIN:LEGACY-REPORTS'
const logContext = { namespace }

const { ActivityReport, User, ActivityReportCollaborator, ActivityReportApprover } = db

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
    const reportId = parseInt(req.params.reportId, DECIMAL_BASE)
    const data = req.body
    const { createdBy, modifiedBy, manager: managers } = data

    const report = await ActivityReport.findByPk(reportId)

    const messages = ['Report updated successfully']

    if (!report) {
      throw new Error('Report not found')
    }

    const { imported } = report

    report.set('imported', {
      ...imported,
      createdBy,
      modifiedBy,
      manager: managers,
    })

    const promises = []

    if (createdBy) {
      const creator = await User.findOne({
        attributes: ['id', 'email'],
        where: {
          email: createdBy.trim(),
        },
      })

      if (!creator) {
        messages.push(`User with email ${createdBy} not found. Report author not updated.`)
      } else {
        report.set('userId', creator.id)
      }
    }
    if (modifiedBy) {
      const collaborator = await User.findOne({
        attributes: ['id', 'email'],
        where: {
          email: modifiedBy.trim(),
        },
      })

      if (!collaborator) {
        messages.push(`User with email ${modifiedBy} not found. Report collaborator not added.`)
      } else {
        promises.push(
          ActivityReportCollaborator.findOrCreate({
            where: {
              activityReportId: report.id,
              userId: collaborator.id,
            },
          })
        )
        promises.push(
          ActivityReportCollaborator.destroy({
            where: {
              activityReportId: report.id,
              userId: {
                [Op.not]: collaborator.id,
              },
            },
          })
        )
      }
    }
    if (managers) {
      const approverIds = []
      const managerialTalent = managers.split(';')
      for (let i = 0; i < managerialTalent.length; i += 1) {
        const manager = managerialTalent[i]
        // eslint-disable-next-line no-await-in-loop
        const approver = await User.findOne({
          attributes: ['id', 'email'],
          where: {
            email: manager.trim(),
          },
        })

        if (!approver) {
          messages.push(`User with email ${manager} not found. Report approver not added.`)
        } else {
          approverIds.push(approver.id)
          promises.push(
            ActivityReportApprover.findOrCreate({
              where: {
                activityReportId: report.id,
                userId: approver.id,
              },
              // we do not want to run the hooks for this model
              // we do not care about tracking the status of the approval
              // for legacy reports
              individualHooks: false,
            })
          )
        }

        promises.push(
          ActivityReportApprover.destroy({
            where: {
              activityReportId: report.id,
              userId: {
                [Op.notIn]: approverIds,
              },
            },
            // same as before, we don't want to
            // be updating statuses of legacy reports
            individualHooks: false,
          })
        )
      }
    }

    promises.push(report.save())
    await Promise.all(promises)

    res.status(httpCodes.OK).json({ messages })
  } catch (err) {
    await handleError(req, res, err, logContext)
  }
}

const router = express.Router()

router.put('/:reportId/users', checkReportIdParam, transactionWrapper(updateLegacyReportUsers))

export default router
