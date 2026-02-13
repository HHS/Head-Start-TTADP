import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { createReport, destroyReport, createGoal } from '../../testUtils'
import filtersToScopes from '../index'
import { Goal, Objective, ActivityReportObjective, ActivityReportGoal, ActivityReportFile, ActivityReportObjectiveFile, File } from '../../models'

describe('goal filtersToScopes', () => {
  describe('resourceAttachment', () => {
    let reportToInclude
    let reportToExclude

    let goalToInclude
    let goalToExclude

    const arResourceFilename = faker.system.fileName()
    const aroResourceFilename = faker.system.fileName()

    const arResourceFilenameExcluded = faker.system.fileName()
    const aroResourceFilenameExcluded = faker.system.fileName()

    let reports = []
    let goals = []
    let goalIds = []
    let resources = []

    beforeAll(async () => {
      reportToInclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      })

      goalToInclude = await createGoal({
        status: 'Closed',
      })

      await ActivityReportGoal.create({
        activityReportId: reportToInclude.id,
        goalId: goalToInclude.id,
        name: goalToInclude.name,
        status: goalToInclude.status,
      })

      const arResource = await File.create({
        originalFileName: arResourceFilename,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      })

      const aroResource = await File.create({
        originalFileName: aroResourceFilename,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      })

      await ActivityReportFile.create({
        activityReportId: reportToInclude.id,
        fileId: arResource.id,
      })

      const objectiveToInclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToInclude.id,
        ttaProvided: '',
      })

      const aroToInclude = await ActivityReportObjective.create({
        activityReportId: reportToInclude.id,
        objectiveId: objectiveToInclude.id,
      })

      await ActivityReportObjectiveFile.create({
        activityReportObjectiveId: aroToInclude.id,
        fileId: aroResource.id,
      })

      reportToExclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      })

      goalToExclude = await createGoal({
        status: 'Closed',
      })

      await ActivityReportGoal.create({
        activityReportId: reportToExclude.id,
        goalId: goalToExclude.id,
        name: goalToExclude.name,
        status: goalToExclude.status,
      })

      const arResourceExcluded = await File.create({
        originalFileName: arResourceFilenameExcluded,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      })

      const aroResourceExcluded = await File.create({
        originalFileName: aroResourceFilenameExcluded,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      })
      await ActivityReportFile.create({
        activityReportId: reportToExclude.id,
        fileId: arResourceExcluded.id,
      })

      const objectiveToExclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToExclude.id,
        ttaProvided: '',
      })

      const aroToExclude = await ActivityReportObjective.create({
        activityReportId: reportToExclude.id,
        objectiveId: objectiveToExclude.id,
      })

      await ActivityReportObjectiveFile.create({
        activityReportObjectiveId: aroToExclude.id,
        fileId: aroResourceExcluded.id,
      })

      reports = [reportToInclude, reportToExclude]

      goals = [goalToInclude, goalToExclude]

      goalIds = goals.map((goal) => goal.id)

      resources = [arResource, aroResource, arResourceExcluded, aroResourceExcluded]
    })

    afterAll(async () => {
      await ActivityReportFile.destroy({
        where: {
          fileId: resources.map((r) => r.id),
        },
      })

      await ActivityReportObjectiveFile.destroy({
        where: {
          fileId: resources.map((r) => r.id),
        },
      })

      await File.destroy({
        where: {
          id: resources.map((r) => r.id),
        },
      })

      const o = await Objective.findAll({
        where: {
          goalId: goals.map((g) => g.id),
        },
      })

      await ActivityReportObjective.destroy({
        where: {
          objectiveId: o.map((ob) => ob.id),
        },
        individualHooks: true,
      })

      await Objective.destroy({
        where: {
          id: o.map((ob) => ob.id),
        },
        individualHooks: true,
        force: true,
      })

      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      })

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      })

      await Promise.all(reports.map((r) => destroyReport(r)))
    })

    describe('ar resource', () => {
      it('in', async () => {
        const filters = { 'resourceAttachment.ctn': arResourceFilename }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        })

        expect(found.length).toEqual(1)
        expect(found[0].id).toEqual(goalToInclude.id)
      })
      it('not in', async () => {
        const filters = { 'resourceAttachment.nctn': arResourceFilename }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        })

        expect(found.length).toEqual(1)
        expect(found[0].id).not.toEqual(goalToInclude.id)
      })
    })

    describe('aro resource', () => {
      it('in', async () => {
        const filters = { 'resourceAttachment.ctn': aroResourceFilename }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        })

        expect(found.length).toEqual(1)
        expect(found[0].id).toEqual(goalToInclude.id)
      })
      it('not in', async () => {
        const filters = { 'resourceAttachment.nctn': aroResourceFilename }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        })

        expect(found.length).toEqual(1)
        expect(found[0].id).not.toEqual(goalToInclude.id)
      })
    })
  })
})
