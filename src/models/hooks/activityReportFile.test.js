import { REPORT_STATUSES } from '@ttahub/common'
import { beforeDestroy, afterDestroy } from './activityReportFile'
import { sequelize, User, ActivityReport } from '..'
import { propagateDestroyToFile } from './genericFile'
import { cleanupOrphanFiles } from '../helpers/orphanCleanupHelper'
import { draftObject, mockApprovers, approverUserIds } from './testHelpers'

jest.mock('./genericFile', () => ({
  propagateDestroyToFile: jest.fn(),
}))

jest.mock('../helpers/orphanCleanupHelper', () => ({
  cleanupOrphanFiles: jest.fn(),
}))

describe('activityReportFile hooks', () => {
  const mockUserIds = approverUserIds()
  const mockUsers = mockApprovers(mockUserIds)

  beforeAll(async () => {
    await User.bulkCreate(mockUsers)
  })

  afterAll(async () => {
    await User.destroy({ where: { id: mockUserIds } })
    await sequelize.close()
  })

  describe('beforeDestroy', () => {
    it('should throw an error if the report is approved', async () => {
      const transaction = await sequelize.transaction()

      const ar = await ActivityReport.create(
        {
          ...draftObject,
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        { transaction }
      )

      const mockInstance = {
        activityReportId: ar.id,
      }
      const mockOptions = {
        transaction,
      }

      await expect(beforeDestroy(sequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed from approved report.')
      await transaction.commit()

      await ActivityReport.destroy({ where: { id: ar.id } })
    })

    it('should not throw an error if the report is not approved', async () => {
      const transaction = await sequelize.transaction()
      const ar = await ActivityReport.create({ ...draftObject }, { transaction })
      const mockInstance = {
        activityReportId: ar.id,
      }
      const mockOptions = {
        transaction,
      }

      await expect(beforeDestroy(sequelize, mockInstance, mockOptions)).resolves.toBeUndefined()

      await transaction.commit()
      await ActivityReport.destroy({ where: { id: ar.id } })
    })
  })

  describe('afterDestroy', () => {
    it('should call hooks', async () => {
      const mockSequelize = {}
      const mockInstance = { fileId: 1 }
      const mockOptions = {}

      await afterDestroy(mockSequelize, mockInstance, mockOptions)

      expect(propagateDestroyToFile).toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions)
      expect(cleanupOrphanFiles).toHaveBeenCalledWith(mockSequelize, 1)
    })
  })
})
