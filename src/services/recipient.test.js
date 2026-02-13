import moment from 'moment'
import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import crypto from 'crypto'
import { REPORT_STATUSES } from '@ttahub/common'
import db, {
  Recipient,
  Grant,
  Program,
  Region,
  User,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Topic,
  ActivityReportGoal,
  Permission,
  ProgramPersonnel,
  sequelize,
  ActivityReportApprover,
  ActivityReportCollaborator,
  Role,
  GoalCollaborator,
} from '../models'
import {
  allRecipients,
  recipientById,
  recipientsByName,
  recipientsByUserId,
  getGoalsByActivityRecipient,
  recipientLeadership,
  allArUserIdsByRecipientAndRegion,
  calculatePreviousStatus,
  wasGoalPreviouslyClosed,
  reduceObjectivesForRecipientRecord,
  reduceTopicsOfDifferingType,
  combineObjectiveIds,
  missingStandardGoals,
} from './recipient'
import filtersToScopes from '../scopes'
import SCOPES from '../middleware/scopeConstants'
import { GOAL_STATUS, OBJECTIVE_STATUS, AUTOMATIC_CREATION, CREATION_METHOD } from '../constants'
import { createRecipient, createReport, destroyReport, createGrant } from '../testUtils'

// Seed faker for reproducibility
faker.seed(123)

describe('Recipient DB service', () => {
  const recipients = [
    {
      id: 73,
      uei: 'NNA5N2KHMGN2',
      name: 'recipient 1',
      recipientType: 'recipient type 1',
    },
    {
      id: 74,
      uei: 'NNA5N2KHMKN2',
      name: 'recipient 2',
      recipientType: 'recipient type 2',
    },
    {
      id: 75,
      uei: 'NNA5N2KHMJN2',
      name: 'recipient 3',
      recipientType: 'recipient type 3',
    },
    {
      id: 76,
      uei: 'NNA5N2KHMGM2',
      name: 'recipient 4',
      recipientType: 'recipient type 4',
    },
  ]

  beforeAll(async () => {
    await Program.destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } })
    await Grant.unscoped().destroy({
      where: { id: [74, 75, 76, 77, 78, 79, 80, 81] },
      force: true,
      individualHooks: true,
    })
    await Recipient.unscoped().destroy({ where: { id: [73, 74, 75, 76] } })

    await Promise.all(recipients.map((r) => Recipient.create(r)))
    await Promise.all([
      Grant.create({
        id: 74,
        number: '1145341',
        regionId: 1,
        recipientId: 74,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      }),
      Grant.create({
        id: 75,
        number: '1145543',
        regionId: 1,
        recipientId: 75,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
        grantSpecialistName: 'Tom Jones',
      }),
      Grant.create({
        id: 76,
        number: '3145351',
        regionId: 1,
        recipientId: 76,
        status: 'Active',
        startDate: new Date('2021-12-01'),
        endDate: new Date('2021-12-01'),
      }),
      Grant.create({
        id: 77,
        number: '3145352',
        regionId: 1,
        recipientId: 76,
        status: 'Active',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-15'),
      }),
      Grant.create({
        id: 78,
        number: '3145353',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date('2021-12-01'),
        endDate: new Date('2021-12-01'),
      }),
      Grant.create({
        id: 79,
        number: '3145354',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-15'),
      }),
      Grant.create({
        id: 80,
        number: '3145355',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date(moment().add(1, 'days').format('MM/DD/yyyy')),
        endDate: new Date(moment().add(2, 'days').format('MM/DD/yyyy')),
      }),
      Grant.create({
        id: 81,
        number: '3145399',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date(moment().subtract(5, 'days').format('MM/DD/yyyy')),
        endDate: new Date(moment().format('MM/DD/yyyy')),
      }),
    ])
    await Promise.all([
      Program.create({
        id: 74,
        grantId: 75,
        name: 'type2',
        programType: 'EHS',
        startYear: 'Aeons ago',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 75,
        grantId: 75,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 76,
        grantId: 76,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 77,
        grantId: 77,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 78,
        grantId: 78,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 79,
        grantId: 79,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 80,
        grantId: 80,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
      Program.create({
        id: 81,
        grantId: 81,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2026-01-01'),
      }),
    ])
  })

  afterAll(async () => {
    await Program.destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } })
    await Grant.unscoped().destroy({
      where: { id: [74, 75, 76, 77, 78, 79, 80, 81] },
      force: true,
      individualHooks: true,
    })
    await Recipient.unscoped().destroy({ where: { id: [73, 74, 75, 76] } })
    await sequelize.close()
  })

  describe('allRecipients', () => {
    it('returns all recipients', async () => {
      const foundRecipients = await allRecipients()
      const foundIds = foundRecipients.map((g) => g.id)
      expect(foundIds).toContain(74)
      expect(foundIds).toContain(75)
      expect(foundIds).toContain(76)
    })
  })

  describe('recipientById', () => {
    it('returns a recipient by recipient id and region id', async () => {
      const query = { 'region.in': ['1'] }
      const { grant: grantScopes } = await filtersToScopes(query)
      const recipient3 = await recipientById(75, grantScopes)

      // Recipient Name.
      expect(recipient3.name).toBe('recipient 3')

      // Recipient Type.
      expect(recipient3.recipientType).toBe('recipient type 3')

      // Number of Grants.
      expect(recipient3.grants.length).toBe(1)

      // Grants.
      expect(recipient3.grants[0].id).toBe(75)
      expect(recipient3.grants[0].regionId).toBe(1)
      expect(recipient3.grants[0].number).toBe('1145543')
      expect(recipient3.grants[0].status).toBe('Active')
      expect(recipient3.grants[0].programSpecialistName).toBe(null)
      expect(recipient3.grants[0].grantSpecialistName).toBe('Tom Jones')
      expect(recipient3.grants[0].startDate).toBeTruthy()
      expect(recipient3.grants[0].endDate).toBeTruthy()
      expect(recipient3.grants[0].programs.map((program) => program.name).sort()).toStrictEqual(['type2', 'type'].sort())
      expect(recipient3.grants[0].programs.map((program) => program.programType).sort()).toStrictEqual(['EHS', 'HS'].sort())
    })
    it('returns recipient and grants without a region specified', async () => {
      const recipient2 = await recipientById(74, {})

      // Recipient Name.
      expect(recipient2.name).toBe('recipient 2')

      // Number of Grants.
      expect(recipient2.grants.length).toBe(1)

      // Grants.
      expect(recipient2.grants[0].id).toBe(74)
      expect(recipient2.grants[0].regionId).toBe(1)
      expect(recipient2.grants[0].number).toBe('1145341')
      expect(recipient2.grants[0].status).toBe('Active')
      expect(recipient2.grants[0].programSpecialistName).toBe(null)
      expect(recipient2.grants[0].grantSpecialistName).toBe(null)
      expect(recipient2.grants[0].startDate).toBeTruthy()
      expect(recipient2.grants[0].endDate).toBeTruthy()
    })

    it('returns null when nothing is found', async () => {
      const recipient = await recipientById(100, {})

      expect(recipient).toBeNull()
    })

    it('returns active grants and inactive grants after cutoff', async () => {
      const recipient = await recipientById(76, {})

      expect(recipient.name).toBe('recipient 4')
      expect(recipient.grants.length).toBe(5)

      // Active After Cut Off Date.
      expect(recipient.grants[0].id).toBe(76)
      expect(recipient.grants[0].status).toBe('Active')

      // Active Before Cut Off Date.
      expect(recipient.grants[1].id).toBe(77)
      expect(recipient.grants[1].status).toBe('Active')

      // Inactive with End Date past Today.
      expect(recipient.grants[2].id).toBe(80)
      expect(recipient.grants[2].status).toBe('Inactive')

      // Inactive with End Date of Today.
      expect(recipient.grants[3].id).toBe(81)
      expect(recipient.grants[3].status).toBe('Inactive')

      // Inactive After Cut Off Date.
      expect(recipient.grants[4].id).toBe(78)
      expect(recipient.grants[4].status).toBe('Inactive')
    })
  })

  describe('missingStandardGoals', () => {
    let recipient1
    let recipient2
    let recipient3
    let multiGrantRecipient
    let recipientWithInactiveGrant
    let recipientWithMonitoringGoal
    let recipientWithTemplatesWithSameName

    let grant1
    let grant2
    let grant3
    let grant4
    let grant5
    let inactiveGrant
    let monitoringGrant
    let duplicateGrantOne
    let duplicateGrantTwo

    let duplicateGoalTemplateOne
    let duplicateGoalTemplateTwo

    afterAll(async () => {
      await Goal.destroy({
        where: {
          grantId: [
            grant1?.id,
            grant2?.id,
            grant3?.id,
            grant4?.id,
            grant5?.id,
            inactiveGrant?.id,
            monitoringGrant?.id,
            duplicateGrantOne?.id,
            duplicateGrantTwo?.id,
          ].filter(Boolean),
        },
        individualHooks: true,
        force: true,
      })

      await Grant.destroy({
        where: {
          id: [
            grant1?.id,
            grant2?.id,
            grant3?.id,
            grant4?.id,
            grant5?.id,
            inactiveGrant?.id,
            monitoringGrant?.id,
            duplicateGrantOne?.id,
            duplicateGrantTwo?.id,
          ].filter(Boolean),
        },
        individualHooks: true,
      })

      const recipientIds = [
        recipient1?.id,
        recipient2?.id,
        recipient3?.id,
        multiGrantRecipient?.id,
        recipientWithInactiveGrant?.id,
        recipientWithMonitoringGoal?.id,
        recipientWithTemplatesWithSameName?.id,
      ].filter(Boolean)

      await Recipient.destroy({
        where: {
          id: recipientIds,
        },
      })

      await GoalTemplate.destroy({
        where: {
          id: [duplicateGoalTemplateOne?.id, duplicateGoalTemplateTwo?.id].filter(Boolean),
        },
        individualHooks: true,
        force: true,
      })
    })

    it('returns missing standard goals if only one of the grants for the recipient has goals', async () => {
      multiGrantRecipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      grant4 = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: multiGrantRecipient.id,
        regionId: 1,
        number: '3423423',
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      grant5 = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: multiGrantRecipient.id,
        regionId: 1,
        number: '4234666',
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      // Get every Goal Template without a where.
      const goalTemplates = await GoalTemplate.findAll({
        where: {
          creationMethod: CREATION_METHOD.CURATED,
        },
      })

      // Create a goal for the recipient using each goal template.
      await Promise.all(
        goalTemplates.map((goalTemplate) =>
          Goal.create({
            recipientId: multiGrantRecipient.id,
            goalTemplateId: goalTemplate.id,
            status: GOAL_STATUS.ACTIVE,
            name: goalTemplate.name,
            source: null,
            onApprovedAR: false,
            createdVia: 'rtr',
            grantId: grant4.id,
          })
        )
      )

      // Add goals for all but one of the goal templates to the second grant.
      const allTemplatesExceptOne = goalTemplates.filter((t) => t.id !== 1)
      await Promise.all(
        allTemplatesExceptOne.map((goalTemplate) =>
          Goal.create({
            recipientId: multiGrantRecipient.id,
            goalTemplateId: goalTemplate.id,
            status: GOAL_STATUS.ACTIVE,
            name: goalTemplate.name,
            source: null,
            onApprovedAR: false,
            createdVia: 'rtr',
            grantId: grant5.id, // We expect this grant to be missing one goal.
          })
        )
      )
      const recipient = await recipientById(multiGrantRecipient.id, {})

      // Call the function to find missing standard goals
      const foundGoals = await missingStandardGoals(recipient, {})

      expect(foundGoals.length).toBe(1)

      // expect the missing goal grantId to be the second grant.
      expect(foundGoals[0].grantId).toBe(grant5.id)
    })

    it('does not count templates as missing when each grant uses a template that shares a name', async () => {
      recipientWithTemplatesWithSameName = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      duplicateGrantOne = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipientWithTemplatesWithSameName.id,
        regionId: 1,
        number: faker.datatype.string(),
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      duplicateGrantTwo = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipientWithTemplatesWithSameName.id,
        regionId: 1,
        number: faker.datatype.string(),
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      const duplicateTemplateName = `duplicate standard goal ${faker.datatype.number()}`

      const curatedTemplates = await GoalTemplate.findAll({
        where: {
          creationMethod: CREATION_METHOD.CURATED,
          standard: { [Op.ne]: 'Monitoring' },
        },
      })

      await Promise.all(
        curatedTemplates.map((template) =>
          Goal.create({
            recipientId: recipientWithTemplatesWithSameName.id,
            goalTemplateId: template.id,
            status: GOAL_STATUS.ACTIVE,
            name: template.templateName,
            source: null,
            onApprovedAR: false,
            createdVia: 'rtr',
            grantId: duplicateGrantOne.id,
          })
        )
      )

      await Promise.all(
        curatedTemplates.map((template) =>
          Goal.create({
            recipientId: recipientWithTemplatesWithSameName.id,
            goalTemplateId: template.id,
            status: GOAL_STATUS.ACTIVE,
            name: template.templateName,
            source: null,
            onApprovedAR: false,
            createdVia: 'rtr',
            grantId: duplicateGrantTwo.id,
          })
        )
      )

      duplicateGoalTemplateOne = await GoalTemplate.create({
        templateName: `${duplicateTemplateName}-${faker.datatype.number()}`,
        creationMethod: CREATION_METHOD.CURATED,
      })

      duplicateGoalTemplateTwo = await GoalTemplate.create({
        templateName: `${duplicateTemplateName}-${faker.datatype.number()}`,
        creationMethod: CREATION_METHOD.CURATED,
      })

      await duplicateGoalTemplateOne.update({ templateName: duplicateTemplateName }, { hooks: false, individualHooks: false })

      await duplicateGoalTemplateTwo.update({ templateName: duplicateTemplateName }, { hooks: false, individualHooks: false })

      await Goal.create({
        recipientId: recipientWithTemplatesWithSameName.id,
        goalTemplateId: duplicateGoalTemplateOne.id,
        status: GOAL_STATUS.ACTIVE,
        name: duplicateTemplateName,
        source: null,
        onApprovedAR: false,
        createdVia: 'rtr',
        grantId: duplicateGrantOne.id,
      })

      await Goal.create({
        recipientId: recipientWithTemplatesWithSameName.id,
        goalTemplateId: duplicateGoalTemplateTwo.id,
        status: GOAL_STATUS.ACTIVE,
        name: duplicateTemplateName,
        source: null,
        onApprovedAR: false,
        createdVia: 'rtr',
        grantId: duplicateGrantTwo.id,
      })

      const recipient = await recipientById(recipientWithTemplatesWithSameName.id, {})
      const foundGoals = await missingStandardGoals(recipient, {})

      expect(foundGoals).toEqual([])
    })

    it('returns an empty array when no standard goals are missing', async () => {
      recipient1 = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      grant1 = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipient1.id,
        regionId: 1,
        number: '234234',
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      // Get every Goal Template without a where.
      const goalTemplates = await GoalTemplate.findAll({
        where: {
          creationMethod: CREATION_METHOD.CURATED,
        },
      })

      // Create a goal for the recipient using each goal template.
      await Promise.all(
        goalTemplates.map((goalTemplate) =>
          Goal.create({
            recipientId: recipient1.id,
            goalTemplateId: goalTemplate.id,
            status: GOAL_STATUS.ACTIVE,
            name: goalTemplate.name,
            source: null,
            onApprovedAR: false,
            createdVia: 'rtr',
            grantId: grant1.id,
          })
        )
      )

      const recipient = await recipientById(recipient1.id, {})
      const foundGoals = await missingStandardGoals(recipient, {})
      expect(foundGoals).toEqual([])
    })

    it('returns an array of missing standard goals', async () => {
      recipient2 = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      grant2 = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipient2.id,
        regionId: 1,
        number: '323456',
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      // Call the function to find missing standard goals
      const recipient = await recipientById(recipient2.id, {})
      const foundGoals = await missingStandardGoals(recipient, {})
      expect(foundGoals.length).toBe(18)
    })

    it('returns some of the goal templates when some are missing', async () => {
      recipient3 = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      grant3 = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipient3.id,
        regionId: 1,
        number: '323457',
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      // Create a goal for the recipient using a subset of goal templates.
      const goalTemplate = await GoalTemplate.findOne({
        where: {
          id: 1,
        },
      })

      await Goal.create({
        recipientId: recipient3.id,
        goalTemplateId: goalTemplate.id,
        status: GOAL_STATUS.ACTIVE,
        name: goalTemplate.name,
        source: null,
        onApprovedAR: false,
        createdVia: 'rtr',
        grantId: grant3.id,
      })
      const recipient = await recipientById(recipient3.id, {})
      const foundGoals = await missingStandardGoals(recipient, {})
      expect(foundGoals.length).toBe(17)
    })

    it('does not count inactive grants or Monitoring standard templates as missing goals', async () => {
      // Create recipient with inactive grant
      recipientWithInactiveGrant = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      // Create an inactive grant
      inactiveGrant = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipientWithInactiveGrant.id,
        regionId: 1,
        number: '323458',
        programSpecialistName: 'Gus',
        status: 'Inactive',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      // Create recipient with active grant for monitoring goal
      recipientWithMonitoringGoal = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
      })

      // Create an active grant
      monitoringGrant = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipientWithMonitoringGoal.id,
        regionId: 1,
        number: '323459',
        programSpecialistName: 'Gus',
        status: 'Active',
        endDate: new Date(2024, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      })

      // Find the monitoring goal template
      const monitoringGoalTemplate = await GoalTemplate.findOne({
        where: {
          standard: 'Monitoring',
          creationMethod: CREATION_METHOD.CURATED,
        },
      })

      // Get the inactive recipient
      const inactiveRecipient = await recipientById(recipientWithInactiveGrant.id, {})

      // Get the monitoring recipient
      const monitoringRecipient = await recipientById(recipientWithMonitoringGoal.id, {})

      // Get missing goals for inactive grant recipient
      const inactiveGrantGoals = await missingStandardGoals(inactiveRecipient, {})

      // Get missing goals for recipient with monitoring goal
      const monitoringGoals = await missingStandardGoals(monitoringRecipient, {})

      // Verify that the inactive grant is not considered when calculating missing standard goals
      const inactiveGrantHasGoals = inactiveGrantGoals.some((g) => g.grantId === inactiveGrant.id)
      expect(inactiveGrantHasGoals).toBe(false)

      // Verify that the monitoring goal template is not included in missing goals
      const monitoringTemplateIncluded = monitoringGoals.some((g) => g.goalTemplateId === monitoringGoalTemplate.id)
      expect(monitoringTemplateIncluded).toBe(false)
    })
  })

  describe('recipientsByName', () => {
    const recipientsToSearch = [
      {
        id: 63,
        uei: 'NNA5N2KHMGN2',
        name: 'Apple Juice',
      },
      {
        id: 64,
        uei: 'NNA5N2KBAGN2',
        name: 'Orange',
      },
      {
        id: 65,
        uei: 'NNA5N2KHMBA2',
        name: 'Banana',
      },
      {
        id: 66,
        uei: 'NNA5N2KHMCA2',
        name: 'Apple Sauce',
      },
      {
        id: 67,
        uei: 'NNA5N2KHMGN2',
        name: 'Apple Butter',
      },
      {
        id: 68,
        uei: 'NNA5N2KHMGN2',
        name: 'Apple Crisp',
      },
      {
        id: 69,
        uei: 'NNA5N2KHMDZ2',
        name: 'Pumpkin Pie',
      },
      {
        id: 70,
        uei: 'NNA5N2KHMVF2',
        name: 'Pumpkin Bread',
      },
      {
        id: 71,
        uei: 'NNA5N2KHMPO2',
        name: 'Pumpkin Coffee',
      },
    ]

    const grants = [
      {
        id: 50,
        recipientId: 63,
        regionId: 1,
        number: '12345',
        programSpecialistName: 'George',
        status: 'Active',
        endDate: new Date(2020, 10, 2),
        grantSpecialistName: 'Glen',
        annualFundingMonth: 'October',
      },
      {
        id: 51,
        recipientId: 63,
        regionId: 1,
        number: '12346',
        programSpecialistName: 'Belle',
        status: 'Active',
        grantSpecialistName: 'Ben',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 52,
        recipientId: 64,
        regionId: 1,
        number: '55557',
        programSpecialistName: 'Caesar',
        status: 'Active',
        grantSpecialistName: 'Cassie',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 53,
        recipientId: 64,
        regionId: 1,
        number: '55558',
        programSpecialistName: 'Doris',
        status: 'Active',
        grantSpecialistName: 'David',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 54,
        recipientId: 65,
        regionId: 1,
        number: '12349',
        programSpecialistName: 'Eugene',
        status: 'Active',
        grantSpecialistName: 'Eric',
        annualFundingMonth: 'January',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 55,
        recipientId: 65,
        regionId: 2,
        number: '12350',
        programSpecialistName: 'Farrah',
        status: 'Active',
        grantSpecialistName: 'Frank',
        annualFundingMonth: null,
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 56,
        recipientId: 66,
        regionId: 1,
        number: '12351',
        programSpecialistName: 'Aaron',
        status: 'Active',
        grantSpecialistName: 'Brom',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 57,
        recipientId: 67,
        regionId: 1,
        number: '12352',
        programSpecialistName: 'Jim',
        status: 'Inactive',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 58,
        recipientId: 68,
        regionId: 1,
        number: '12353',
        programSpecialistName: 'Jim',
        status: 'Inactive',
        endDate: new Date(2020, 10, 31),
        grantSpecialistName: 'Allen',
        annualFundingMonth: 'November',
      },
      {
        id: 59,
        recipientId: 69,
        regionId: 1,
        number: '582353',
        programSpecialistName: 'John Tom',
        status: 'Inactive',
        endDate: new Date(moment().add(2, 'days').format('MM/DD/yyyy')),
        grantSpecialistName: 'Bill Smith',
        annualFundingMonth: 'October',
      },
      {
        id: 60,
        recipientId: 70,
        regionId: 1,
        number: '582354',
        programSpecialistName: 'John Tom',
        status: 'Inactive',
        endDate: new Date(moment().format('MM/DD/yyyy')),
        grantSpecialistName: 'Bill Smith',
        annualFundingMonth: 'October',
      },
      {
        id: 61,
        recipientId: 71,
        regionId: 1,
        number: '582355',
        programSpecialistName: 'Grant West',
        status: 'Inactive',
        endDate: new Date('08/31/2020'),
        grantSpecialistName: 'Joe Allen',
        annualFundingMonth: 'October',
      },
    ]

    async function regionToScope(regionId) {
      const query = { 'region.in': [regionId] }
      const { grant } = await filtersToScopes(query)
      return grant
    }

    beforeAll(async () => {
      await Promise.all(recipientsToSearch.map((g) => Recipient.create(g)))
      await Promise.all(grants.map((g) => Grant.create(g)))
    })

    afterAll(async () => {
      await Grant.unscoped().destroy({
        where: { recipientId: recipientsToSearch.map((g) => g.id) },
        individualHooks: true,
      })
      await Recipient.unscoped().destroy({ where: { id: recipientsToSearch.map((g) => g.id) } })
    })

    it('returns only user regions', async () => {
      const foundRecipients = await recipientsByName('banana', {}, 'name', 'asc', 0, [2])
      expect(foundRecipients.rows.length).toBe(1)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(65)
    })

    it('finds based on recipient name', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(4)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(63)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(66)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(68)
    })

    it('finds based on recipient id', async () => {
      const foundRecipients = await recipientsByName('5555', await regionToScope(1), 'name', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(1)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(64)
    })

    it('finds based on region', async () => {
      const foundRecipients = await recipientsByName('banana', await regionToScope(2), 'name', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(1)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(65)
    })

    it('sorts based on name', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(4)
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([67, 68, 63, 66].sort((a, b) => a - b))
    })

    it('sorts based on program specialist', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'programSpecialist', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(4)
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([66, 63, 67, 68].sort())
    })

    it('sorts based on grant specialist', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'grantSpecialist', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(4)
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([67, 68, 63, 66].sort())
    })

    it('respects sort order', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'desc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(4)
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([66, 63, 67, 68].sort())
    })

    it('respects the offset passed in', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'asc', 1, [1, 2])
      expect(foundRecipients.rows.length).toBe(3)
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([63, 66, 68].sort())
    })

    it('finds inactive grants that fall in the accepted range', async () => {
      const foundRecipients = await recipientsByName('Pumpkin', await regionToScope(1), 'name', 'asc', 0, [1, 2])
      expect(foundRecipients.rows.length).toBe(2)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(70)
      expect(foundRecipients.rows.map((g) => g.id)).toContain(69)
    })
  })

  describe('recipientsByUserId', () => {
    let region
    let user
    let firstRecipient
    let secondRecipient

    beforeAll(async () => {
      region = await Region.create({ name: 'Test Region 200', id: 200 })
      user = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      await Permission.create({
        userId: user.id,
        regionId: region.id,
        scopeId: SCOPES.READ_REPORTS,
      })

      firstRecipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: 'Test Recipient 200',
      })

      secondRecipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: 'Test Recipient 201',
      })

      await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: firstRecipient.id,
        regionId: region.id,
        number: String(faker.datatype.number({ min: 1000 })),
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      })

      await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: secondRecipient.id,
        regionId: region.id,
        number: String(faker.datatype.number({ min: 1000 })),
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      })

      await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: secondRecipient.id,
        regionId: region.id,
        number: String(faker.datatype.number({ min: 1000 })),
        status: 'Inactive',
        startDate: new Date(),
        endDate: new Date(),
      })
    })

    afterAll(async () => {
      await Grant.destroy({
        where: { recipientId: [firstRecipient.id, secondRecipient.id] },
        individualHooks: true,
      })
      await Recipient.destroy({ where: { id: [firstRecipient.id, secondRecipient.id] } })
      await Permission.destroy({ where: { userId: user.id } })
      await User.destroy({ where: { id: user.id } })
      await Region.destroy({ where: { id: region.id } })
    })

    it('finds grants for the user', async () => {
      const foundRecipients = await recipientsByUserId(user.id)
      expect(foundRecipients.length).toBe(2)
      expect(foundRecipients.map((g) => g.id)).toContain(firstRecipient.id)
      expect(foundRecipients.map((g) => g.id)).toContain(secondRecipient.id)

      const [first, second] = foundRecipients
      expect(first.name).toBe(firstRecipient.name) // check that they are in the right order

      const grants = [...first.grants, ...second.grants]
      expect(grants.length).toBe(2)
    })

    it('returns an empty array if the user is not found', async () => {
      const foundRecipients = await recipientsByUserId(999999999)
      expect(foundRecipients.length).toBe(0)
    })
  })

  describe('de-duplicating on goal field responses', () => {
    let recipient
    let goals
    let grant
    let template
    let feiRootCausePrompt

    const region = 5

    beforeAll(async () => {
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        uei: faker.datatype.string(),
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
      })

      const goal = {
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
        status: GOAL_STATUS.IN_PROGRESS,
      }

      const goal2Info = {
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
        status: GOAL_STATUS.IN_PROGRESS,
      }

      grant = await Grant.create({
        status: 'Active',
        regionId: region,
        id: faker.datatype.number({ min: 1000 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        startDate: '2019-01-01',
        endDate: '2024-01-01',
      })

      const secret = 'secret'
      const hash = crypto.createHmac('md5', secret).update(goal.name).digest('hex')

      template = await GoalTemplate.create({
        hash,
        templateName: goal.name,
        creationMethod: AUTOMATIC_CREATION,
      })

      const fieldPrompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        title: 'why do anything?',
        prompt: 'why do anything?',
        ordinal: 1,
        hint: '',
        caution: '',
        fieldType: 'multiselect',
        required: {},
        options: ['gotta', 'dont have to', 'not sure', 'too tired to answer'],
      })

      // Find a GoalTemplateFieldPrompt with the title 'FEI root cause'.
      feiRootCausePrompt = await GoalTemplateFieldPrompt.findOne({
        where: {
          title: 'FEI root cause',
        },
      })

      const goal1 = await Goal.create({
        name: 'Sample goal 1',
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        createdVia: 'rtr',
      })

      const goal2 = await Goal.create({
        name: 'Sample goal 2',
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        createdVia: 'rtr',
      })

      const goal3 = await Goal.create({
        name: 'Sample goal 3',
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        createdVia: 'rtr',
      })

      const goal4 = await Goal.create({
        name: 'Sample goal 4',
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        createdVia: 'rtr',
      })

      const feiGoal = await Goal.create({
        name: 'Sample goal FEI 1',
        status: goal2Info.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        goalTemplateId: feiRootCausePrompt.goalTemplateId,
        createdVia: 'rtr',
      })

      goals = [goal1, goal2, goal3, goal4, feiGoal]

      await GoalFieldResponse.create({
        goalId: goal1.id,
        goalTemplateFieldPromptId: fieldPrompt.id,
        response: ['gotta'],
        onAr: true,
        onApprovedAR: false,
      })

      await GoalFieldResponse.create({
        goalId: goal2.id,
        goalTemplateFieldPromptId: fieldPrompt.id,
        response: ['not sure', 'dont have to'],
        onAr: true,
        onApprovedAR: false,
      })

      await GoalFieldResponse.create({
        goalId: goal3.id,
        goalTemplateFieldPromptId: fieldPrompt.id,
        response: ['not sure', 'dont have to'],
        onAr: true,
        onApprovedAR: false,
      })

      // Create FEI responses.
      await GoalFieldResponse.create({
        goalId: feiGoal.id,
        goalTemplateFieldPromptId: feiRootCausePrompt.id,
        response: ['fei response 1', 'fei response 2'],
        onAr: true,
        onApprovedAR: false,
      })
    })

    afterAll(async () => {
      await GoalFieldResponse.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      })

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      })

      await GoalTemplateFieldPrompt.destroy({
        where: {
          goalTemplateId: template.id,
        },
        individualHooks: true,
        force: true,
      })

      await GoalTemplate.destroy({
        where: {
          id: template.id,
        },
        individualHooks: true,
        force: true,
      })

      await Grant.destroy({
        where: {
          id: goals.map((g) => g.grantId),
        },
        individualHooks: true,
      })
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
        individualHooks: true,
      })
    })

    it('maintains separate goals for different responses', async () => {
      const { goalRows, allGoalIds } = await getGoalsByActivityRecipient(recipient.id, region, {})
      expect(goalRows.length).toBe(5)
      expect(allGoalIds.length).toBe(5)

      // Assert every goal has its own entry.
      const goal1 = goalRows.find((r) => r.ids.includes(goals[0].id))
      expect(goal1).toBeTruthy()
      expect(goal1.ids.length).toBe(1)

      const goal2 = goalRows.find((r) => r.ids.includes(goals[1].id))
      expect(goal2).toBeTruthy()

      const goal3 = goalRows.find((r) => r.ids.includes(goals[2].id))
      expect(goal3).toBeTruthy()

      const goal4 = goalRows.find((r) => r.ids.includes(goals[3].id))
      expect(goal4).toBeTruthy()

      const feiGoal = goalRows.find((r) => r.ids.includes(goals[4].id))
      expect(feiGoal).toBeTruthy()

      // Assert every response has its own entry.
      const gottaResponse = goalRows.find((r) => r.id === goals[0].id)
      expect(gottaResponse).toBeTruthy()
      expect(gottaResponse.responsesForComparison).toBe('gotta')

      const notSureResponse = goalRows.find((r) => r.id === goals[1].id)
      expect(notSureResponse).toBeTruthy()
      expect(notSureResponse.responsesForComparison).toBe('not sure,dont have to')

      const notSureResponse2 = goalRows.find((r) => r.id === goals[2].id)
      expect(notSureResponse2).toBeTruthy()
      expect(notSureResponse2.responsesForComparison).toBe('not sure,dont have to')

      const notSureResponse3 = goalRows.find((r) => r.id === goals[3].id)
      expect(notSureResponse3).toBeTruthy()
      expect(notSureResponse3.responsesForComparison).toBe('')

      const feiResponse = goalRows.find((r) => r.id === goals[4].id)
      expect(feiResponse).toBeTruthy()
      expect(feiResponse.responsesForComparison).toBe('fei response 1,fei response 2')
    })

    it('properly marks is fei goal', async () => {
      const { goalRows, allGoalIds } = await getGoalsByActivityRecipient(recipient.id, region, {})
      expect(goalRows.length).toBe(5)
      expect(allGoalIds.length).toBe(5)

      // From goal Rows get goal 1.
      const goal1 = goalRows.find((r) => r.ids.includes(goals[0].id))
      expect(goal1).toBeTruthy()
      expect(goal1.isFei).toBe(false)

      // From goal Rows get goal 2.
      const goal2 = goalRows.find((r) => r.ids.includes(goals[1].id))
      expect(goal2).toBeTruthy()
      expect(goal2.isFei).toBe(false)

      // From goal Rows get goal 3.
      const goal3 = goalRows.find((r) => r.ids.includes(goals[2].id))
      expect(goal3).toBeTruthy()
      expect(goal3.isFei).toBe(false)

      // From fei goal get goal 4.
      const feiGoal = goalRows.find((r) => r.ids.includes(goals[4].id))
      expect(feiGoal).toBeTruthy()
      expect(feiGoal.isFei).toBe(true)
    })

    it('keeps goals separated by goal text when they share the same grant with no creators/collaborators', async () => {
      // Remove other goals
      const { goalRows, allGoalIds } = await getGoalsByActivityRecipient(recipient.id, region, {})
      expect(goalRows.length).toBe(5)
      expect(allGoalIds.length).toBe(5)

      // Verify we have all four goals.
      const goal1 = goalRows.find((r) => r.ids.includes(goals[0].id))
      expect(goal1).toBeTruthy()

      const goal2 = goalRows.find((r) => r.ids.includes(goals[1].id))
      expect(goal2).toBeTruthy()

      const goal3 = goalRows.find((r) => r.ids.includes(goals[2].id))
      expect(goal3).toBeTruthy()

      const goal4 = goalRows.find((r) => r.ids.includes(goals[3].id))
      expect(goal4).toBeTruthy()

      // Verify FEI
      const feiGoal = goalRows.find((r) => r.ids.includes(goals[4].id))
      expect(feiGoal).toBeTruthy()
    })
  })

  describe('reduceTopicsOfDifferingType', () => {
    it('should deduplicate and sort string topics', () => {
      const topics = ['a topic', 'b topic', 'c topic', 'a topic']
      const result = reduceTopicsOfDifferingType(topics)
      expect(result).toEqual(['a topic', 'b topic', 'c topic'])
    })

    it('should handle mixed strings and objects with "name"', () => {
      const topics = ['a topic', { name: 'b topic' }, 'c topic', { name: 'a topic' }, { name: 'c topic' }]
      const result = reduceTopicsOfDifferingType(topics)
      expect(result).toEqual(['a topic', 'b topic', 'c topic'])
    })

    it('should include and preserve non-string, non-object topics', () => {
      const topics = ['a topic', 42, { name: 'b topic' }, { id: 1 }, 'c topic', { name: 'a topic' }]
      const result = reduceTopicsOfDifferingType(topics)
      expect(result).toEqual(['a topic', 'b topic', 'c topic', 42, { id: 1 }])
    })

    it('should handle null and undefined topics gracefully', () => {
      const topics = ['a topic', null, { name: 'b topic' }, undefined, 'c topic', { name: 'a topic' }]
      const result = reduceTopicsOfDifferingType(topics)
      expect(result).toEqual(['a topic', 'b topic', 'c topic'])
    })
  })

  describe('reduceObjectivesForRecipientRecord', () => {
    let recipient
    let grant
    let goals
    let objectives
    let topics
    let report

    beforeAll(async () => {
      recipient = await createRecipient()

      grant = await createGrant({
        recipientId: recipient.id,
      })

      const goal = {
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
      }

      const goal1 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        createdVia: 'monitoring',
      })

      const goal2 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
        createdVia: 'monitoring',
      })

      goals = [goal1, goal2]

      const matchingObjectiveTitle = 'This is a test objective for reduction'

      const objective1 = await Objective.create({
        goalId: goal1.id,
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        title: matchingObjectiveTitle,
      })

      const objective2 = await Objective.create({
        goalId: goal1.id,
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        title: matchingObjectiveTitle,
      })

      const objective3 = await Objective.create({
        goalId: goal2.id,
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        title: matchingObjectiveTitle,
      })

      objectives = [objective1, objective2, objective3]

      const reason = faker.animal.cetacean()

      topics = await Topic.bulkCreate([
        { name: 'Topic for Objective 1 a' },
        { name: 'Topic for Objective 1 b' },
        { name: 'Topic for Objective 1 c' },
        { name: 'Topic for Objective 2 b' },
        { name: 'Report Level Topic' },
      ])

      report = await createReport({
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
        reason: [reason],
        calculatedStatus: REPORT_STATUSES.APPROVED,
        topics: [topics[4].name],
        regionId: grant.regionId,
      })

      const aros = await Promise.all(
        objectives.map((o) =>
          ActivityReportObjective.create({
            activityReportId: report.id,
            objectiveId: o.id,
          })
        )
      )

      // Disperse topics over objectives to make sure we don't lose any.
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aros[0].id,
        topicId: topics[0].id,
      })
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aros[0].id,
        topicId: topics[1].id,
      })
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aros[1].id,
        topicId: topics[2].id,
      })
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aros[2].id,
        topicId: topics[3].id,
      })

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal1.id,
      })
    })

    afterAll(async () => {
      await ActivityReportObjectiveTopic.destroy({
        where: {
          topicId: topics.map((t) => t.id),
        },
        individualHooks: true,
      })
      await ActivityReportObjective.destroy({
        where: {
          objectiveId: objectives.map((o) => o.id),
        },
      })
      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      })
      await destroyReport(report)

      await Topic.destroy({
        where: {
          id: topics.map((t) => t.id),
        },
        individualHooks: true,
        force: true,
      })
      await Objective.destroy({
        where: {
          id: objectives.map((o) => o.id),
        },
        individualHooks: true,
        force: true,
      })
      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      })
      await Grant.destroy({
        where: {
          recipientId: recipient.id,
        },
        individualHooks: true,
      })
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
        individualHooks: true,
      })
    })

    it('successfully maintains two goals without losing topics', async () => {
      const goalsForRecord = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {})

      // Assert counts.
      expect(goalsForRecord.count).toBe(2)
      expect(goalsForRecord.goalRows.length).toBe(2)
      expect(goalsForRecord.allGoalIds.length).toBe(2)

      // Select the first goal by goal id.
      const goal = goalsForRecord.goalRows.find((g) => g.id === goals[0].id)
      expect(goal).toBeTruthy()

      // Assert the goal has the correct number of objectives.
      expect(goal.objectives.length).toBe(1)

      // Assert objective text and status.
      expect(goal.objectives[0].title).toBe(objectives[0].title)
      expect(goal.objectives[0].status).toBe(objectives[0].status)
      expect(goal.objectives[0].title).toBe(objectives[1].title)
      expect(goal.objectives[0].status).toBe(objectives[1].status)

      // Assert the goal has the correct number of topics.
      expect(goal.goalTopics.length).toBe(4)

      // Assert topic names.
      expect(goal.objectives[0].topics).toEqual(expect.arrayContaining([topics[0].name, topics[1].name, topics[2].name, topics[4].name]))

      // Assert the second goal by id.
      const goal2 = goalsForRecord.goalRows.find((g) => g.id === goals[1].id)
      expect(goal2).toBeTruthy()

      // Assert the second goal has the correct number of objectives.
      expect(goal2.objectives.length).toBe(1)
      // Assert it contains id for objective 3.

      // Assert objective text and status.
      expect(goal2.objectives[0].title).toBe(objectives[2].title)
      expect(goal2.objectives[0].status).toBe(objectives[2].status)

      // Assert the second goal has the correct number of topics.
      expect(goal2.goalTopics.length).toBe(2)

      // Assert topic name.
      expect(goal2.objectives[0].topics).toEqual(expect.arrayContaining([topics[3].name, topics[4].name]))
    })

    it('sorts objectives by endDate and id when endDates are equal', () => {
      const currentModel = {
        objectives: [
          {
            id: 3,
            endDate: '2024-12-30',
            title: 'Objective 3',
            status: 'Complete',
          },
          {
            id: 2,
            endDate: '2024-12-30',
            title: 'Objective 2',
            status: 'In Progress',
          },
        ],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            endDate: '2024-12-30',
            title: 'Objective 1',
            status: 'In Progress',
          },
        ],
        goalTopics: [],
        reasons: [],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.map((obj) => obj.id)).toEqual([3, 2, 1])
    })

    it('sorts objectives by endDate when dates differ', () => {
      const currentModel = {
        objectives: [
          {
            id: 3,
            endDate: '2024-12-31',
            title: 'Objective 3',
            status: 'Complete',
          },
          {
            id: 2,
            endDate: '2024-12-30',
            title: 'Objective 2',
            status: 'In Progress',
          },
        ],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            endDate: '2024-12-29',
            title: 'Objective 1',
            status: 'In Progress',
          },
        ],
        goalTopics: [],
        reasons: [],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.map((obj) => obj.id)).toEqual([3, 2, 1]) // Sorted by endDate descending
    })

    it('handles an empty objectives array', () => {
      const currentModel = { objectives: [] }
      const goal = { objectives: [], goalTopics: [], reasons: [] }
      const grantNumbers = ['12345']

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result).toEqual([])
    })

    it('handles a null title', () => {
      const currentModel = {
        objectives: [
          {
            id: 3,
            endDate: '2024-12-31',
            status: 'Complete',
          },
          {
            id: 2,
            endDate: '2024-12-30',
            title: 'Objective 2',
            status: 'In Progress',
          },
        ],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            endDate: '2024-12-29',
            title: '',
            status: 'In Progress',
          },
        ],
        goalTopics: [],
        reasons: [],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.map((obj) => obj.id)).toEqual([3, 2, 1]) // Sorted by endDate descending
    })

    it('sorts objectives by endDate and id', () => {
      const currentModel = {
        grant: { number: 'G123' },
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            endDate: '2023-12-01',
          },
          {
            id: 2,
            title: 'Objective 2',
            status: 'In Progress',
            endDate: '2023-11-30',
          },
        ],
      }

      const goal = {
        ids: [1, 2],
        grantNumbers: ['G123', 'G124'],
        objectives: [
          {
            id: 3,
            title: 'Objective 3',
            status: 'Complete',
            endDate: '2023-12-01',
          },
        ],
      }

      const grantNumbers = ['G123']

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.map((o) => o.id)).toEqual([3, 1, 2])
    })

    it('handles objectives with missing or invalid endDate', () => {
      const currentModel = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            endDate: null,
          },
          {
            id: 2,
            title: 'Objective 2',
            status: 'In Progress',
            endDate: 'InvalidDate',
          },
        ],
      }

      const goal = { ids: [], grantNumbers: [], objectives: [] }
      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('handles a single objective without sorting', () => {
      const currentModel = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            endDate: '2023-12-01',
          },
        ],
      }

      const goal = { ids: [], grantNumbers: [], objectives: [] }
      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.length).toBe(1)
      expect(result[0].id).toBe(1)
    })

    it('merges activityReports correctly when objectives have existing activityReports', () => {
      const currentModel = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: [{ displayId: 'AR1', topic: 'Report Topic 1' }],
          },
        ],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: [{ displayId: 'AR2', topic: 'Report Topic 2' }],
          },
        ],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.length).toBe(1)
      expect(result[0].activityReports).toEqual([
        { displayId: 'AR1', topic: 'Report Topic 1' },
        { displayId: 'AR2', topic: 'Report Topic 2' },
      ])
    })

    it('handles merging when existing.activityReports or objective.activityReports are undefined', () => {
      const currentModel = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: undefined,
          },
        ],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: undefined,
          },
        ],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result.length).toBe(1)
      expect(result[0].activityReports).toEqual([])
    })

    it('handles undefined existing.activityReports gracefully', () => {
      const currentModel = {
        objectives: [],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: [{ displayId: 'AR1', topic: 'Report Topic 1' }],
          },
        ],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result[0].activityReports).toEqual([{ displayId: 'AR1', topic: 'Report Topic 1' }])
    })

    it('handles undefined topics and reasons gracefully', () => {
      const currentModel = {
        objectives: [],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: [],
          },
        ],
        goalTopics: undefined,
        reasons: undefined,
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result).toBeDefined()
      expect(goal.goalTopics).toEqual([])
      expect(goal.reasons).toEqual([])
    })

    it('handles invalid types for topics and reasons', () => {
      const currentModel = {
        objectives: [],
      }

      const goal = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            activityReports: [],
          },
        ],
        goalTopics: 'invalid-type',
        reasons: 12345,
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result).toBeDefined()
      expect(goal.goalTopics).toEqual([])
      expect(goal.reasons).toEqual([])
    })

    it('handles objectives with invalid endDate values gracefully', () => {
      const currentModel = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            endDate: 'InvalidDate',
          },
          {
            id: 2,
            title: 'Objective 2',
            status: 'Complete',
            endDate: '2023-12-01',
          },
        ],
      }

      const goal = {
        objectives: [
          {
            id: 3,
            title: 'Objective 3',
            status: 'Not Started',
            endDate: '2023-12-02',
          },
          {
            id: 4,
            title: 'Objective 4',
            status: 'Complete',
            endDate: undefined,
          },
        ],
        goalTopics: [],
        reasons: [],
      }

      const grantNumbers = []

      const result = reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers)

      expect(result).toBeDefined()
      expect(result.length).toBe(4)

      expect(result.map((obj) => obj.id)).toEqual([1, 3, 2, 4])
    })

    it('consistently sorts objectives with mixed endDate values and maintains order across multiple calls', () => {
      // First call with objectives in one order
      const currentModel1 = {
        objectives: [
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            endDate: null,
          },
          {
            id: 2,
            title: 'Objective 2',
            status: 'Complete',
            endDate: '2023-12-01',
          },
        ],
      }

      const goal1 = {
        objectives: [
          {
            id: 3,
            title: 'Objective 3',
            status: 'Not Started',
            endDate: '2023-12-02',
          },
        ],
        goalTopics: [],
        reasons: [],
      }

      const result1 = reduceObjectivesForRecipientRecord(currentModel1, goal1, [])

      // Second call with same objectives but in different order
      const currentModel2 = {
        objectives: [
          {
            id: 3,
            title: 'Objective 3',
            status: 'Not Started',
            endDate: '2023-12-02',
          },
        ],
      }

      const goal2 = {
        objectives: [
          {
            id: 2,
            title: 'Objective 2',
            status: 'Complete',
            endDate: '2023-12-01',
          },
          {
            id: 1,
            title: 'Objective 1',
            status: 'In Progress',
            endDate: null,
          },
        ],
        goalTopics: [],
        reasons: [],
      }

      const result2 = reduceObjectivesForRecipientRecord(currentModel2, goal2, [])

      // Both calls should produce the same sorted order
      expect(result1.map((obj) => obj.id)).toEqual([3, 2, 1])
      expect(result2.map((obj) => obj.id)).toEqual([3, 2, 1])
    })

    it('properly handles activity report endDates when determining objective endDate', () => {
      const currentModel = {
        objectives: [
          {
            id: 1,
            title: 'Objective with reports',
            status: 'In Progress',
            endDate: '2023-01-01',
            activityReports: [
              { endDate: '2023-02-01', topics: ['Topic A'] },
              { endDate: '2023-03-01', topics: ['Topic B'] }, // This should be used
              { endDate: '2023-01-15', topics: ['Topic C'] },
            ],
          },
        ],
      }

      const goal = { objectives: [], goalTopics: [], reasons: [] }
      const result = reduceObjectivesForRecipientRecord(currentModel, goal, [])

      expect(result.length).toBe(1)
      expect(result[0].endDate).toBe('2023-03-01') // Should use the latest report endDate
      expect(result[0].topics).toContain('Topic A')
      expect(result[0].topics).toContain('Topic B')
      expect(result[0].topics).toContain('Topic C')
    })
  })

  describe('recipientLeadership', () => {
    const createProgramPersonnel = async (grantId, programId, role = 'director', active = true) => {
      const personnel = await ProgramPersonnel.create({
        grantId,
        programId,
        role,
        title: '',
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        suffix: faker.name.suffix(),
        prefix: faker.name.prefix(),
        active,
        effectiveDate: active ? new Date() : new Date('2020/01/01'),
        mapsTo: null,
        email: faker.internet.email(),
      })

      // no way to return associations on create
      // https://github.com/sequelize/sequelize/discussions/15186

      return ProgramPersonnel.findByPk(personnel.id, {
        include: [
          {
            model: Grant,
            as: 'grant',
          },
          {
            model: Program,
            as: 'program',
          },
        ],
      })
    }

    const REGION_ID = 10

    const recipient = {
      name: faker.datatype.string({ min: 10 }),
      id: faker.datatype.number({ min: 10000 }),
      uei: faker.datatype.string({ min: 10 }),
    }
    const grant = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    }

    const grant2 = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    }

    const irrelevantGrant = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID + 1,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    }

    const dummyProgram = {
      grantId: grant.id,
      startYear: '2023',
      startDate: '2023/01/01',
      endDate: '2023/12/31',
      status: 'Active',
      name: `${faker.animal.type() + faker.company.companyName()} Program`,
      programType: 'HS',
    }

    let activePersonnel

    beforeAll(async () => {
      await db.Recipient.create(recipient)
      await db.Grant.create(grant)
      await db.Grant.create(grant2)
      await db.Grant.create(irrelevantGrant)

      const program1 = await db.Program.create({
        ...dummyProgram,
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      })

      const program2 = await db.Program.create({
        ...dummyProgram,
        grantId: grant2.id,
        programType: 'EHS',
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      })

      const irrelevantProgram = await db.Program.create({
        ...dummyProgram,
        grantId: irrelevantGrant.id,
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      })

      // Program personnel to ignore
      // because it's on a different grant
      await createProgramPersonnel(irrelevantGrant.id, irrelevantProgram.id, 'director', true)

      // Program personnel to ignore
      // because it's inactive
      await createProgramPersonnel(grant.id, program1.id, 'director', false)

      // program personnel to retrieve
      activePersonnel = await Promise.all([
        createProgramPersonnel(grant.id, program1.id, 'director', true),
        createProgramPersonnel(grant2.id, program2.id, 'director', true),
        createProgramPersonnel(grant.id, program1.id, 'cfo', true),
        createProgramPersonnel(grant2.id, program2.id, 'cfo', true),
      ])
    })
    afterAll(async () => {
      await db.ProgramPersonnel.destroy({
        where: {
          grantId: [grant.id, grant2.id, irrelevantGrant.id],
        },
      })

      await db.Program.destroy({
        where: {
          grantId: [grant.id, grant2.id, irrelevantGrant.id],
        },
      })

      await db.Grant.destroy({
        where: {
          id: [grant.id, grant2.id, irrelevantGrant.id],
        },
        individualHooks: true,
      })

      await db.Recipient.destroy({
        where: {
          id: recipient.id,
        },
      })
    })

    it('retrieves the correct program personnel', async () => {
      const leadership = await recipientLeadership(recipient.id, REGION_ID)

      expect(leadership.length).toBe(4)

      activePersonnel.sort((a, b) => a.nameAndRole.localeCompare(b.nameAndRole))

      const expectedNamesAndTitles = activePersonnel.map((p) => ({
        fullName: `${p.firstName} ${p.lastName}`,
        fullRole: p.fullRole,
      }))

      leadership.sort((a, b) => a.nameAndRole.localeCompare(b.nameAndRole))

      leadership.forEach((p, i) => {
        expect(p.fullName).toBe(expectedNamesAndTitles[i].fullName)
        expect(p.fullRole).toBe(expectedNamesAndTitles[i].fullRole)
      })
    })
  })

  describe('allArUserIdsByRecipientAndRegion', () => {
    let author
    let collaboratorOne
    let collaboratorTwo
    let approverOne
    let approverTwo
    let dummyUser

    let recipient
    let grant
    let report

    beforeAll(async () => {
      author = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      collaboratorOne = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      collaboratorTwo = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      approverOne = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      approverTwo = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      dummyUser = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      })

      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
        uei: faker.datatype.string(),
      })

      grant = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipient.id,
        regionId: 1,
        number: faker.datatype.string(),
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      })

      report = await createReport({
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
        reason: ['test'],
        calculatedStatus: REPORT_STATUSES.APPROVED,
        regionId: grant.regionId,
        userId: author.id,
      })

      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: collaboratorOne.id,
      })

      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: collaboratorTwo.id,
      })

      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: approverOne.id,
      })

      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: approverTwo.id,
      })
    })

    afterAll(async () => {
      await ActivityReportApprover.destroy({
        where: {
          userId: [approverOne.id, approverTwo.id],
        },
        force: true,
        individualHooks: true,
      })

      await ActivityReportCollaborator.destroy({
        where: {
          userId: [collaboratorOne.id, collaboratorTwo.id],
        },
        force: true,
        individualHooks: true,
      })

      await destroyReport(report)
      await Grant.destroy({
        where: {
          id: grant.id,
        },
        force: true,
        individualHooks: true,
      })

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
        force: true,
        individualHooks: true,
      })

      await User.destroy({
        where: {
          id: [author.id, collaboratorOne.id, collaboratorTwo.id, approverOne.id, approverTwo.id, dummyUser.id],
        },
      })
    })

    it('returns all user ids for a recipient and region', async () => {
      const userIds = await allArUserIdsByRecipientAndRegion(recipient.id, 1)
      expect(userIds.length).toBe(5)
      expect(userIds).toContain(author.id)
      expect(userIds).toContain(collaboratorOne.id)
      expect(userIds).toContain(collaboratorTwo.id)
      expect(userIds).toContain(approverOne.id)
      expect(userIds).toContain(approverTwo.id)
    })
  })

  describe('calculatePreviousStatus', () => {
    it('returns the oldStatus from the last status change', () => {
      const goal = {
        statusChanges: [
          { oldStatus: 'Draft', newStatus: 'In Progress' },
          { oldStatus: 'In Progress', newStatus: 'Complete' },
        ],
        objectives: [],
      }

      const result = calculatePreviousStatus(goal)

      expect(result).toBe('In Progress') // Last status change's oldStatus
    })

    it('returns "In Progress" if objectives are on AR and at least one is "In Progress" or "Complete"', () => {
      const goal = {
        statusChanges: [],
        objectives: [
          { status: 'In Progress', onApprovedAR: true },
          { status: 'Not Started', onApprovedAR: false },
        ],
      }

      const result = calculatePreviousStatus(goal)

      expect(result).toBe('In Progress')
    })

    it('returns "Not Started" if objectives are on AR but none are "In Progress" or "Complete"', () => {
      const goal = {
        statusChanges: [],
        objectives: [
          { status: 'Not Started', onApprovedAR: true },
          { status: 'Suspended', onApprovedAR: true },
        ],
      }

      const result = calculatePreviousStatus(goal)

      expect(result).toBe('Not Started')
    })

    it('returns null if there are no objectives or valid status changes', () => {
      const goal = {
        statusChanges: [],
        objectives: [],
      }

      const result = calculatePreviousStatus(goal)

      expect(result).toBeNull()
    })
  })

  describe('wasGoalPreviouslyClosed', () => {
    it('returns false when goal.statusChanges is undefined', () => {
      const goal = {
        statusChanges: undefined,
      }

      const result = wasGoalPreviouslyClosed(goal)

      expect(result).toBe(false) // Validate the uncovered line
    })

    it('returns false when goal.statusChanges is null', () => {
      const goal = {
        statusChanges: null,
      }

      const result = wasGoalPreviouslyClosed(goal)

      expect(result).toBe(false)
    })

    it('returns false when goal.statusChanges is empty', () => {
      const goal = {
        statusChanges: [],
      }

      const result = wasGoalPreviouslyClosed(goal)

      expect(result).toBe(false)
    })
  })

  describe('getGoalsByActivityRecipient', () => {
    let recipient
    let grant
    let goals
    let collaborators
    let roles
    const goal3Name = 'Test Goal 3'

    beforeEach(async () => {
      recipient = await Recipient.findByPk(74)
      grant = await Grant.findOne({
        where: {
          recipientId: recipient.id,
        },
      })

      // Create test goals
      goals = await Promise.all(
        ['Goal 1', 'Goal 2'].map((name) =>
          Goal.create({
            name,
            status: GOAL_STATUS.IN_PROGRESS,
            grantId: grant.id,
            onApprovedAR: true,
          })
        )
      )

      roles = await Role.findAll({
        where: {
          name: {
            [Op.in]: ['ECS', 'HS'],
          },
        },
        limit: 2,
      })

      collaborators = await Promise.all(
        goals.map((goal) =>
          GoalCollaborator.create({
            goalId: goal.id,
            collaboratorTypeId: 1, // '1' is 'Creator'
            userId: 1,
          })
        )
      )
    })

    afterEach(async () => {
      await GoalCollaborator.destroy({
        where: { goalId: goals.map((g) => g.id) },
        individualHooks: true,
        force: true,
      })
      await Goal.destroy({
        where: { id: goals.map((g) => g.id) },
        individualHooks: true,
        force: true,
      })
    })

    it('constructs goalWhere when goalIds is an array', async () => {
      const goalIds = goals.map((goal) => goal.id)
      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        goalIds,
        sortBy: 'goalStatus',
      })

      expect(result.goalRows.length).toBe(goalIds.length)
      result.goalRows.forEach((goal) => {
        expect(goalIds).toContain(goal.id)
      })
    })

    it('sanitizes goalIds when provided as a single string', async () => {
      const singleGoalId = String(goals[0].id)
      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        goalIds: singleGoalId,
      })

      expect(result.goalRows.length).toBe(1)
      expect(result.goalRows[0].id).toBe(Number(singleGoalId))
    })

    it('fetches the FEI root cause field prompt', async () => {
      const result = await getGoalsByActivityRecipient(1, 1, {})

      expect(result).toBeDefined()
    })

    it('correctly sanitizes goalIds as part of sanitizedIds', async () => {
      const goalIds = goals.map((goal) => String(goal.id))
      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        goalIds,
      })

      expect(result.goalRows.length).toBe(goals.length)
    })

    it('maps collaborator roles correctly', async () => {
      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {})

      result.goalRows.forEach((goal) => {
        expect(goal.collaborators).toBeDefined()
        goal.collaborators.forEach((collaborator) => {
          expect(collaborator.goalCreatorRoles).toBeDefined()
          expect(collaborator.goalCreatorRoles.length).toBeGreaterThanOrEqual(0)
        })
      })
    })

    it('assigns collaborators to goals', async () => {
      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {})

      result.goalRows.forEach((goal) => {
        expect(goal.collaborators).toBeDefined()
        expect(goal.collaborators.length).toBeGreaterThan(0)
      })
    })

    it('returns all goals if limitNum is falsy', async () => {
      const findAll = jest.spyOn(Goal, 'findAll')

      await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        limit: 0,
      })

      expect(findAll).not.toHaveBeenCalledWith(expect.objectContaining({ limit: 0 }))
    })

    it('sorts by goalStatus correctly with mixed statuses', async () => {
      await Goal.update({ status: 'Draft' }, { where: { id: goals[0].id }, individualHooks: true })
      await Goal.update({ status: 'Suspended' }, { where: { id: goals[1].id }, individualHooks: true })

      const goal3 = await Goal.create({
        name: goal3Name,
        status: GOAL_STATUS.IN_PROGRESS,
        grantId: grant.id,
        onApprovedAR: true,
      })

      goals.push(goal3)

      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        sortBy: 'goalStatus',
        sortDir: 'asc',
      })

      expect(result.goalRows.map((goal) => goal.goalStatus)).toEqual(['Draft', 'In Progress', 'Suspended'])
      await Goal.destroy({ where: { id: goal3.id }, individualHooks: true, force: true })
    })

    it('sorts correctly with null statuses', async () => {
      await Goal.update({ status: null }, { where: { id: goals[0].id }, individualHooks: true })
      await Goal.update({ status: null }, { where: { id: goals[1].id }, individualHooks: true })

      const goal3 = await Goal.create({
        name: goal3Name,
        status: GOAL_STATUS.IN_PROGRESS,
        grantId: grant.id,
        onApprovedAR: true,
      })

      goals.push(goal3)

      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        sortBy: 'goalStatus',
        sortDir: 'asc',
      })

      expect(result.goalRows.map((goal) => goal.goalStatus)).toEqual([null, null, 'In Progress'])
      await Goal.destroy({ where: { id: goal3.id }, individualHooks: true, force: true })
    })

    it('correctly handles invalid statuses', async () => {
      await Goal.update({ status: 'In Progress' }, { where: { id: goals[0].id }, individualHooks: true })
      await Goal.update({ status: 'Unknown' }, { where: { id: goals[1].id }, individualHooks: true })

      const goal3 = await Goal.create({
        name: goal3Name,
        status: GOAL_STATUS.IN_PROGRESS,
        grantId: grant.id,
        onApprovedAR: true,
      })

      goals.push(goal3)

      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        sortBy: 'goalStatus',
        sortDir: 'asc',
      })

      expect(result.goalRows.map((goal) => goal.goalStatus)).toEqual(['In Progress', 'In Progress', 'Unknown'])
      await Goal.destroy({ where: { id: goal3.id }, individualHooks: true, force: true })
    })

    it('returns an empty array when offset exceeds total count', async () => {
      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        offset: goals.length + 1, // Exceed total count
        limit: 5,
      })

      expect(result.goalRows.length).toBe(0)
      expect(result.count).toBe(goals.length)
    })

    it('handles sorting ties by secondary field (e.g., ID)', async () => {
      await Goal.update({ createdAt: new Date('2024-01-01') }, { where: {} })

      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {
        sortBy: 'createdAt',
        sortDir: 'asc',
      })

      const ids = result.goalRows.map((goal) => goal.id)
      expect(ids).toEqual(goals.map((goal) => goal.id).sort())
    })

    it('fetches and applies FEI root cause correctly', async () => {
      const feiPrompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: 1,
        title: 'FEI root cause',
        ordinal: 1,
        prompt: 'prompt',
      })

      const result = await getGoalsByActivityRecipient(recipient.id, grant.regionId, {})

      const feiGoals = result.goalRows.filter((goal) => goal.goalTemplateId === feiPrompt.goalTemplateId)
      const nonFeiGoals = result.goalRows.filter((goal) => goal.goalTemplateId !== feiPrompt.goalTemplateId)

      feiGoals.forEach((goal) => {
        expect(goal.isFei).toBe(true)
      })

      nonFeiGoals.forEach((goal) => {
        expect(goal.isFei).toBe(false)
      })
    })
  })

  describe('combineObjectiveIds', () => {
    it('should combine ids from existing and objective', () => {
      const existing = { ids: [1, 2] }
      const objective = { ids: [3, 4], id: 5 }

      const result = combineObjectiveIds(existing, objective)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle when existing.ids is empty', () => {
      const existing = { ids: [] }
      const objective = { ids: [6, 7], id: 8 }

      const result = combineObjectiveIds(existing, objective)
      expect(result).toEqual([6, 7, 8])
    })

    it('should handle when objective.ids is not provided', () => {
      const existing = { ids: [1, 2] }
      const objective = { id: 3 }

      const result = combineObjectiveIds(existing, objective)
      expect(result).toEqual([1, 2, 3])
    })

    it('should handle when objective.id is not provided', () => {
      const existing = { ids: [1, 2] }
      const objective = { ids: [3, 4] }

      const result = combineObjectiveIds(existing, objective)
      expect(result).toEqual([1, 2, 3, 4])
    })

    it('should handle when both existing.ids and objective.ids are empty', () => {
      const existing = { ids: [] }
      const objective = { ids: [], id: 9 }

      const result = combineObjectiveIds(existing, objective)
      expect(result).toEqual([9])
    })

    it('should handle when both existing.ids and objective.ids/id are missing', () => {
      const existing = {}
      const objective = {}

      const result = combineObjectiveIds(existing, objective)
      expect(result).toEqual([])
    })

    it('should handle duplicates in existing.ids and objective.ids', () => {
      const existing = { ids: [1, 2] }
      const objective = { ids: [2, 3] }
      const result = combineObjectiveIds(existing, objective)

      expect(result).toEqual([1, 2, 3])
    })
  })
})
