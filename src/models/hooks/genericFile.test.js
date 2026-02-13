import { sequelize, ActivityReportObjective, ActivityReportObjectiveFile, Objective, File, ActivityReport, ActivityReportFile } from '..'
import { FILE_STATUSES, OBJECTIVE_STATUS } from '../../constants'
import { propagateDestroyToFile } from './genericFile'
import { draftObject } from './testHelpers'

// Mock addDeleteFileToQueue from src/services/s3Queue.js
jest.mock('../../services/s3Queue', () => ({
  addDeleteFileToQueue: jest.fn(),
}))

describe('propagateDestroyToFile', () => {
  afterAll(async () => {
    await sequelize.close()
  })

  it('should delete the file if it is not associated with any other models', async () => {
    // eslint-disable-next-line global-require
    const { addDeleteFileToQueue } = require('../../services/s3Queue')
    const transaction = await sequelize.transaction()
    const file = await File.create(
      {
        originalFileName: 'test.pdf',
        key: 'test.pdf',
        status: FILE_STATUSES.UPLOADED,
        fileSize: 123445,
      },
      { transaction }
    )

    const mockInstance = { fileId: file.id }
    const mockOptions = { transaction }

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions)

    expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, file.key)
    const foundFile = await File.findOne({
      where: { id: file.id },
      transaction,
    })

    expect(foundFile).toBeNull()
    await transaction.commit()
  })

  it("won't destroy the file if its on a report", async () => {
    const ar = await ActivityReport.create({ ...draftObject })
    const file = await File.create({
      originalFileName: 'test.pdf',
      key: 'test.pdf',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    })

    await ActivityReportFile.create({
      activityReportId: ar.id,
      fileId: file.id,
    })

    const mockInstance = {
      fileId: file.id,
    }

    const transaction = await sequelize.transaction()

    const mockOptions = {
      transaction,
    }

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions)
    await transaction.commit()

    const foundFile = await File.findOne({
      where: { id: file.id },
    })

    expect(foundFile).not.toBeNull()

    await ActivityReportFile.destroy({
      where: { activityReportId: ar.id, fileId: file.id },
    })

    await File.destroy({
      where: { id: file.id },
    })

    await ActivityReport.destroy({
      where: { id: ar.id },
    })
  })

  it("won't destroy the file if its on a report objective", async () => {
    const transaction = await sequelize.transaction()

    const ar = await ActivityReport.create({ ...draftObject }, { transaction })
    const objective = await Objective.create(
      {
        title: 'test',
        status: OBJECTIVE_STATUS.DRAFT,
      },
      { transaction }
    )

    const file = await File.create(
      {
        originalFileName: 'test.pdf',
        key: 'test.pdf',
        status: FILE_STATUSES.UPLOADED,
        fileSize: 123445,
      },
      { transaction }
    )

    const aro = await ActivityReportObjective.create(
      {
        activityReportId: ar.id,
        objectiveId: objective.id,
      },
      { transaction }
    )

    await ActivityReportObjectiveFile.create(
      {
        activityReportObjectiveId: aro.id,
        fileId: file.id,
      },
      { transaction }
    )

    const mockInstance = {
      fileId: file.id,
    }

    const mockOptions = {
      transaction,
    }

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions)

    await transaction.commit()

    const foundFile = await File.findOne({
      where: { id: file.id },
    })

    expect(foundFile).not.toBeNull()

    await ActivityReportObjectiveFile.destroy({
      where: { activityReportObjectiveId: aro.id, fileId: file.id },
    })

    await File.destroy({
      where: { id: file.id },
    })

    await ActivityReportObjective.destroy({
      where: { id: aro.id },
    })

    await Objective.destroy({
      where: { id: objective.id },
      force: true,
    })

    await ActivityReport.destroy({
      where: { id: ar.id },
    })
  })
})
