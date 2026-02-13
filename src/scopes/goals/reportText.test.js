import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { createReport, destroyReport, createGoal } from '../../testUtils'
import filtersToScopes from '../index'
import { Goal, Objective, ActivityReportObjective, ActivityReportGoal, NextStep } from '../../models'

describe('goal filtersToScopes', () => {
  describe('reportText', () => {
    const nextStepsNote = faker.lorem.sentence()
    let nextStepsGoal
    let nextStepsReport

    const argName = faker.lorem.sentence()
    let argNameGoal
    let argNameReport

    const objectiveTitle = faker.lorem.sentence()
    let objectiveTitleGoal
    let objectiveTitleReport

    const objectiveTTAProvided = faker.lorem.sentence()
    let objectiveTTAProvidedGoal
    let objectiveTTAProvidedReport

    const arContext = faker.lorem.sentence()
    let arContextGoal
    let arContextReport

    const arAdditionalNotes = faker.lorem.sentence()
    let arAdditionalNotesGoal
    let arAdditionalNotesReport

    let reports = []
    let goals = []
    let goalIds = []

    beforeAll(async () => {
      nextStepsReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      })
      await NextStep.create({
        activityReportId: nextStepsReport.id,
        note: nextStepsNote,
        noteType: 'RECIPIENT',
      })

      nextStepsGoal = await createGoal({
        status: 'Closed',
      })

      await ActivityReportGoal.create({
        activityReportId: nextStepsReport.id,
        goalId: nextStepsGoal.id,
        name: nextStepsGoal.name,
        status: nextStepsGoal.status,
      })

      argNameReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      })
      argNameGoal = await createGoal({
        name: argName,
        status: 'Closed',
      })
      await ActivityReportGoal.create({
        activityReportId: argNameReport.id,
        goalId: argNameGoal.id,
        name: argNameGoal.name,
        status: argNameGoal.status,
      })

      objectiveTitleReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      })
      objectiveTitleGoal = await createGoal({
        status: 'In Progress',
      })
      const objectiveTitleObjective = await Objective.create({
        title: objectiveTitle,
        goalId: objectiveTitleGoal.id,
        ttaProvided: '',
      })
      await ActivityReportGoal.create({
        activityReportId: objectiveTitleReport.id,
        goalId: objectiveTitleGoal.id,
        name: objectiveTitleGoal.name,
        status: objectiveTitleGoal.status,
      })
      await ActivityReportObjective.create({
        activityReportId: objectiveTitleReport.id,
        objectiveId: objectiveTitleObjective.id,
        ttaProvided: '',
        title: objectiveTitleObjective.title,
      })

      objectiveTTAProvidedReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      })
      objectiveTTAProvidedGoal = await createGoal({
        status: 'In Progress',
      })
      const objectiveTTAObjective = await Objective.create({
        title: faker.lorem.sentence(),
        goalId: objectiveTTAProvidedGoal.id,
        ttaProvided: objectiveTTAProvided,
      })
      await ActivityReportGoal.create({
        activityReportId: objectiveTTAProvidedReport.id,
        goalId: objectiveTTAProvidedGoal.id,
        name: objectiveTTAProvidedGoal.name,
        status: objectiveTTAProvidedGoal.status,
      })
      await ActivityReportObjective.create({
        activityReportId: objectiveTTAProvidedReport.id,
        objectiveId: objectiveTTAObjective.id,
        ttaProvided: objectiveTTAProvided,
        title: objectiveTTAObjective.title,
      })
      arContextReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        context: arContext,
      })

      arContextGoal = await createGoal({
        status: 'Not Started',
      })

      await ActivityReportGoal.create({
        activityReportId: arContextReport.id,
        goalId: arContextGoal.id,
      })

      arAdditionalNotesReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        additionalNotes: arAdditionalNotes,
      })

      arAdditionalNotesGoal = await createGoal({
        status: 'In Progress',
      })

      await ActivityReportGoal.create({
        activityReportId: arAdditionalNotesReport.id,
        goalId: arAdditionalNotesGoal.id,
      })

      reports = [nextStepsReport, argNameReport, objectiveTitleReport, objectiveTTAProvidedReport, arContextReport, arAdditionalNotesReport]

      goals = [nextStepsGoal, argNameGoal, objectiveTitleGoal, objectiveTTAProvidedGoal, arContextGoal, arAdditionalNotesGoal]

      goalIds = goals.map((goal) => goal.id)
    })

    afterAll(async () => {
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

      await NextStep.destroy({
        where: {
          activityReportId: reports.map((r) => r.id),
        },
        individualHooks: true,
      })

      await Promise.all(reports.map((r) => destroyReport(r)))
    })

    describe('next steps', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': nextStepsNote }
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
        expect(found[0].id).toEqual(nextStepsGoal.id)
      })
      it('not in', async () => {
        const filters = { 'reportText.nctn': nextStepsNote }
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

        expect(found.length).toEqual(goalIds.length - 1)
        expect(found.map((g) => g.id)).not.toContain(nextStepsGoal.id)
      })
    })

    describe('goal name', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': argName }
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
        expect(found[0].id).toEqual(argNameGoal.id)
      })
      it('not in', async () => {
        const filters = { 'reportText.nctn': argName }
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

        expect(found.length).toEqual(goalIds.length - 1)
        expect(found.map((g) => g.id)).not.toContain(argNameGoal.id)
      })
    })

    describe('objective title', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': objectiveTitle }
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
        expect(found[0].id).toEqual(objectiveTitleGoal.id)
      })
      it('not in', async () => {
        const filters = { 'reportText.nctn': objectiveTitle }
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

        expect(found.length).toEqual(goalIds.length - 1)
        expect(found.map((g) => g.id)).not.toContain(objectiveTitleGoal.id)
      })
    })

    describe('objective TTA provided', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': objectiveTTAProvided }
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
        expect(found[0].id).toEqual(objectiveTTAProvidedGoal.id)
      })
      it('not in', async () => {
        const filters = { 'reportText.nctn': objectiveTTAProvided }
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

        expect(found.length).toEqual(goalIds.length - 1)
        expect(found.map((g) => g.id)).not.toContain(objectiveTTAProvidedGoal.id)
      })
    })
    describe('ar context', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': arContext }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        })
        expect(found.length).toEqual(1)
        expect(found[0].id).toEqual(arContextGoal.id)
      })
      it('not in', async () => {
        const filters = { 'reportText.nctn': arContext }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        })
        expect(found.map((g) => g.id)).not.toContain(arContextGoal.id)
        expect(found.length).toEqual(goalIds.length - 1)
      })
    })

    describe('ar additional notes', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': arAdditionalNotes }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        })
        expect(found.length).toEqual(1)
        expect(found[0].id).toEqual(arAdditionalNotesGoal.id)
      })
      it('not in', async () => {
        const filters = { 'reportText.nctn': arAdditionalNotes }
        const { goal: scope } = await filtersToScopes(filters, 'goal')
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        })
        expect(found.map((g) => g.id)).not.toContain(arAdditionalNotesGoal.id)
        expect(found.length).toEqual(goalIds.length - 1)
      })
    })
  })
})
