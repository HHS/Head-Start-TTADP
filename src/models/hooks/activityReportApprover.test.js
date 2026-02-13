import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common'
import { sequelize, User, ActivityReport, ActivityReportApprover } from '..'
import { calculateReportStatusFromApprovals, afterDestroy, afterRestore, afterUpdate } from './activityReportApprover'

import { draftObject, mockApprovers, approverUserIds } from './testHelpers'

describe('activityReportApprover hooks', () => {
  const mockUserIds = approverUserIds()
  const mockUsers = mockApprovers(mockUserIds)

  beforeAll(async () => {
    await User.bulkCreate(mockUsers)
  })

  afterAll(async () => {
    await User.destroy({ where: { id: mockUserIds } })
    await sequelize.close()
  })

  describe('calculateReportStatusFromApprovals', () => {
    it('should return APPROVED if all approvers are APPROVED', () => {
      const approverStatuses = [APPROVER_STATUSES.APPROVED, APPROVER_STATUSES.APPROVED, APPROVER_STATUSES.APPROVED]
      const result = calculateReportStatusFromApprovals(approverStatuses)
      expect(result).toEqual(REPORT_STATUSES.APPROVED)
    })

    it('should return NEEDS_ACTION if any approval is NEEDS_ACTION', () => {
      const approverStatuses = [APPROVER_STATUSES.APPROVED, APPROVER_STATUSES.NEEDS_ACTION, APPROVER_STATUSES.APPROVED]
      const result = calculateReportStatusFromApprovals(approverStatuses)
      expect(result).toEqual(REPORT_STATUSES.NEEDS_ACTION)
    })

    it('should otherwise return submitted', () => {
      const approverStatuses = [APPROVER_STATUSES.SUBMITTED]
      const result = calculateReportStatusFromApprovals(approverStatuses)
      expect(result).toEqual(REPORT_STATUSES.SUBMITTED)
    })
  })

  describe('afterDestroy', () => {
    it('updates the calculated status of the report after approval destruction', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      })

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }))

      await ActivityReportApprover.bulkCreate(approvals)

      const mockInstance = {
        activityReportId: ar.id,
      }

      await afterDestroy(sequelize, mockInstance)

      const updatedReport = await ActivityReport.findByPk(ar.id)

      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED)

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true })

      await ActivityReport.destroy({ where: { id: ar.id } })
    })

    it("otherwise, it doesn't update the calculated status of the report", async () => {
      const ar = await ActivityReport.create({ ...draftObject })

      const mockInstance = {
        activityReportId: ar.id,
      }

      await afterDestroy(sequelize, mockInstance)

      const updatedReport = await ActivityReport.findByPk(ar.id)
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT)

      await ActivityReport.destroy({ where: { id: ar.id } })
    })
  })

  describe('afterRestore', () => {
    it('updates the calculated status of the report after approval restoration', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      })

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }))

      await ActivityReportApprover.bulkCreate(approvals)

      const mockInstance = {
        activityReportId: ar.id,
      }

      await afterRestore(sequelize, mockInstance)

      const updatedReport = await ActivityReport.findByPk(ar.id)

      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED)

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true })

      await ActivityReport.destroy({ where: { id: ar.id } })
    })

    it("otherwise, it doesn't update the calculated status of the report", async () => {
      const ar = await ActivityReport.create({ ...draftObject })

      const mockInstance = {
        activityReportId: ar.id,
      }

      await afterRestore(sequelize, mockInstance)

      const updatedReport = await ActivityReport.findByPk(ar.id)
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT)

      await ActivityReport.destroy({ where: { id: ar.id } })
    })
  })

  describe('afterUpdate', () => {
    it('updates the calculated status of the report after approval restoration', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      })

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }))

      await ActivityReportApprover.bulkCreate(approvals)

      const mockInstance = {
        activityReportId: ar.id,
      }

      await afterUpdate(sequelize, mockInstance)

      const updatedReport = await ActivityReport.findByPk(ar.id)

      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED)

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true })

      await ActivityReport.destroy({ where: { id: ar.id } })
    })

    it("otherwise, it doesn't update the calculated status of the report", async () => {
      const ar = await ActivityReport.create({ ...draftObject })

      const mockInstance = {
        activityReportId: ar.id,
      }

      await afterUpdate(sequelize, mockInstance)

      const updatedReport = await ActivityReport.findByPk(ar.id)
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT)

      await ActivityReport.destroy({ where: { id: ar.id } })
    })
  })
})
