import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { createReport, destroyReport, createGoal, createGrant, createRecipient } from '../../testUtils'
import filtersToScopes from '../index'
import db, {
  Goal,
  Objective,
  ActivityReportObjective,
  Recipient,
  Topic,
  Grant,
  Group,
  GroupGrant,
  User,
  Resource,
  ActivityReportGoal,
  ActivityReportGoalResource,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  ActivityReportResource,
  NextStep,
  NextStepResource,
  ActivityReportFile,
  ActivityReportObjectiveFile,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  GroupCollaborator,
  File,
} from '../../models'
import { GOAL_STATUS } from '../../constants'
import { withoutStatus, withStatus } from './status'
import { withoutTtaType, withTtaType } from './ttaType'
import { onlyValidParticipants, withParticipants, withoutParticipants } from './participants'

export {
  Op,
  faker,
  createReport,
  destroyReport,
  createGoal,
  createGrant,
  createRecipient,
  filtersToScopes,
  db,
  Goal,
  Objective,
  ActivityReportObjective,
  Recipient,
  Topic,
  Grant,
  Group,
  GroupGrant,
  User,
  Resource,
  ActivityReportGoal,
  ActivityReportGoalResource,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  ActivityReportResource,
  NextStep,
  NextStepResource,
  ActivityReportFile,
  ActivityReportObjectiveFile,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  GroupCollaborator,
  File,
  GOAL_STATUS,
  withoutStatus,
  withStatus,
  withoutTtaType,
  withTtaType,
  onlyValidParticipants,
  withParticipants,
  withoutParticipants,
}

export const REGION_ID = 10
export const { sequelize } = db

export const sharedTestData = {
  reportIds: null,
  objectiveIds: null,
  possibleGoalIds: null,
  emptyReport: null,
  reportWithReasons: null,
  reportWithTopics: null,
  grant: null,
  topicsGrant: null,
  reasonsGrant: null,
  otherGrant: null,
  goalGrant: null,
  activityReportGoalIds: null,
  ots: [],
}

export async function setupSharedTestData() {
  sharedTestData.goalGrant = await createGrant()
  sharedTestData.grant = await createGrant({ regionId: REGION_ID, number: 'BROC1234' })
  sharedTestData.topicsGrant = await createGrant({ regionId: REGION_ID, number: 'DSWEC56R78' })
  sharedTestData.reasonsGrant = await createGrant({ regionId: REGION_ID, number: 'JNDC532548' })
  sharedTestData.otherGrant = await createGrant({ regionId: 11, number: 'CAUL4567' })

  sharedTestData.emptyReport = await createReport({
    activityRecipients: [],
    calculatedStatus: 'approved',
    reason: [],
    topics: [],
    region: 15,
  })
  sharedTestData.reportWithReasons = await createReport({
    calculatedStatus: 'approved',
    reason: ['Full Enrollment'],
    topics: ['CLASS: Emotional Support'],
    activityRecipients: [{ grantId: sharedTestData.reasonsGrant.id }],
    region: 15,
  })
  sharedTestData.reportWithTopics = await createReport({
    calculatedStatus: 'approved',
    reason: ['Complaint'],
    activityRecipients: [{ grantId: sharedTestData.topicsGrant.id }],
    topics: ['Behavioral / Mental Health / Trauma'],
    region: REGION_ID,
  })

  const goals = await Promise.all([
    // goal for reasons
    await Goal.create({
      name: 'Goal 1',
      status: null,
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: sharedTestData.reasonsGrant.id,
      isRttapa: 'Yes',
    }),
    // goal for topics
    await Goal.create({
      name: 'Goal 2',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: sharedTestData.topicsGrant.id,
      isRttapa: 'Yes',
    }),
    // goal for status
    await Goal.create({
      name: 'Goal 3',
      status: 'In Progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: sharedTestData.goalGrant.id,
      isRttapa: 'No',
    }),
    // goal for status
    await Goal.create({
      name: 'Goal 4',
      status: null,
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: sharedTestData.goalGrant.id,
      isRttapa: 'No',
    }),
    // goal for startDate
    await Goal.create({
      name: 'Goal 5',
      status: 'Suspended',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-10'),
      grantId: sharedTestData.goalGrant.id,
    }),
  ])

  // Activity Report Goals.
  const activityReportGoals = await Promise.all([
    ActivityReportGoal.create({
      activityReportId: sharedTestData.reportWithReasons.id,
      goalId: goals[0].id,
      status: goals[0].status,
    }),
    ActivityReportGoal.create({
      activityReportId: sharedTestData.reportWithTopics.id,
      goalId: goals[1].id,
      status: goals[1].status,
    }),
  ])

  sharedTestData.activityReportGoalIds = activityReportGoals.map((o) => o.id)

  const objectives = await Promise.all([
    // goal for reasons
    await Objective.create({
      goalId: goals[0].id,
      title: 'objective 1',
      topics: [],
      status: 'Not Started',
    }),
    // goal for topics
    await Objective.create({
      goalId: goals[1].id,
      title: 'objective 2',
      topics: ['Behavioral / Mental Health / Trauma'],
      status: 'Not Started',
    }),
    // goal for status
    await Objective.create({
      goalId: goals[2].id,
      title: 'objective 3',
      status: 'Not Started',
    }),
    // goal for startDate
    await Objective.create({
      goalId: goals[3].id,
      title: 'objective 4',
      status: 'Not Started',
    }),
  ])
  const [topicOne] = await Topic.findOrCreate({
    where: {
      name: 'CLASS: Emotional Support',
    },
  })

  const [topicTwo] = await Topic.findOrCreate({
    where: {
      name: 'Behavioral / Mental Health / Trauma',
    },
  })

  // goal for topics
  const aroWithTopics = await ActivityReportObjective.create({
    objectiveId: objectives[1].id,
    activityReportId: sharedTestData.reportWithTopics.id,
    ttaProvided: 'asdfadf',
    status: objectives[1].status,
  })

  sharedTestData.ots.push(
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aroWithTopics.id,
      topicId: topicOne.id,
    })
  )

  sharedTestData.ots.push(
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aroWithTopics.id,
      topicId: topicTwo.id,
    })
  )

  await Promise.all([
    // goal for reasons
    await ActivityReportObjective.create({
      objectiveId: objectives[0].id,
      activityReportId: sharedTestData.reportWithReasons.id,
      ttaProvided: 'asdfadf',
      status: objectives[0].status,
    }),
    // goal for status
    await ActivityReportObjective.create({
      objectiveId: objectives[2].id,
      activityReportId: sharedTestData.emptyReport.id,
      ttaProvided: 'asdfadf',
      status: objectives[2].status,
    }),
    // goal for startDate
    await ActivityReportObjective.create({
      objectiveId: objectives[3].id,
      activityReportId: sharedTestData.emptyReport.id,
      ttaProvided: 'asdfadf',
      status: objectives[3].status,
    }),
  ])

  goals.push(await createGoal({ status: 'Suspended', name: 'Goal 6', grantId: sharedTestData.grant.id }))
  goals.push(await createGoal({ status: 'Closed', name: 'Goal 7', grantId: sharedTestData.otherGrant.id }))

  sharedTestData.reportIds = [sharedTestData.emptyReport.id, sharedTestData.reportWithReasons.id, sharedTestData.reportWithTopics.id]
  sharedTestData.objectiveIds = objectives.map((o) => o.id)
  sharedTestData.possibleGoalIds = goals.map((g) => g.id)
}

export async function tearDownSharedTestData() {
  await ActivityReportObjective.destroy({
    where: {
      activityReportId: sharedTestData.reportIds,
    },
    individualHooks: true,
  })

  await ActivityReportObjectiveTopic.destroy({
    where: {
      id: sharedTestData.ots.map((ot) => ot.id),
    },
    individualHooks: true,
  })

  await Objective.destroy({
    where: {
      id: sharedTestData.objectiveIds,
    },
    individualHooks: true,
    force: true,
  })

  await ActivityReportGoal.destroy({
    where: {
      id: sharedTestData.activityReportGoalIds,
    },
    individualHooks: true,
  })

  await Goal.destroy({
    where: {
      id: sharedTestData.possibleGoalIds,
    },
    individualHooks: true,
    force: true,
  })

  await Promise.all(
    [sharedTestData.emptyReport, sharedTestData.reportWithReasons, sharedTestData.reportWithTopics].map(async (report) => destroyReport(report))
  )

  await Grant.destroy({
    where: {
      id: [
        sharedTestData.goalGrant.id,
        sharedTestData.grant.id,
        sharedTestData.otherGrant.id,
        sharedTestData.topicsGrant.id,
        sharedTestData.reasonsGrant.id,
      ],
    },
    individualHooks: true,
  })

  await Recipient.destroy({
    where: {
      id: [
        sharedTestData.goalGrant.recipientId,
        sharedTestData.grant.recipientId,
        sharedTestData.otherGrant.recipientId,
        sharedTestData.topicsGrant.recipientId,
        sharedTestData.reasonsGrant.recipientId,
      ],
    },
    individualHooks: true,
  })

  sharedTestData.reportIds = null
  sharedTestData.objectiveIds = null
  sharedTestData.possibleGoalIds = null
  sharedTestData.emptyReport = null
  sharedTestData.reportWithReasons = null
  sharedTestData.reportWithTopics = null
  sharedTestData.grant = null
  sharedTestData.topicsGrant = null
  sharedTestData.reasonsGrant = null
  sharedTestData.otherGrant = null
  sharedTestData.goalGrant = null
  sharedTestData.activityReportGoalIds = null
  sharedTestData.ots = []
}
