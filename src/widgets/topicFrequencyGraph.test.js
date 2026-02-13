import { REPORT_STATUSES, TOPICS } from '@ttahub/common'
import db, {
  ActivityReport,
  ActivityRecipient,
  ActivityReportCollaborator,
  User,
  Recipient,
  Grant,
  NextStep,
  Region,
  Role,
  UserRole,
  Goal,
  ActivityReportObjective,
  Objective,
  ActivityReportObjectiveTopic,
  Topic,
} from '../models'
import filtersToScopes from '../scopes'
import { topicFrequencyGraph } from './topicFrequencyGraph'

jest.mock('bull')

const GRANT_ID = 4040
const RECIPIENT_ID = 5050

const mockUser = {
  id: 9945620,
  homeRegionId: 1,
  name: 'user9945620',
  hsesUsername: 'user9945620',
  hsesUserId: '9945620',
  role: ['Grants Specialist'],
  lastLogin: new Date(),
}

const mockUserTwo = {
  id: 2245942,
  homeRegionId: 1,
  name: 'user2245942',
  hsesUsername: 'user2245942',
  hsesUserId: 'user2245942',
  role: ['System Specialist'],
  lastLogin: new Date(),
}

const mockUserThree = {
  id: 33068305,
  homeRegionId: 1,
  name: 'user33068305',
  hsesUsername: 'user33068305',
  hsesUserId: 'user33068305',
  role: ['Grants Specialist'],
  lastLogin: new Date(),
}

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: RECIPIENT_ID, grantId: GRANT_ID }],
  numberOfParticipants: 11,
  deliveryMethod: 'in-person',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants', 'genies'],
  topics: ['Program Planning and Services', 'Child Assessment, Development, Screening'], // One to be mapped from legacy.
  ttaType: ['technical-assistance'],
  version: 2,
}

const regionOneReport = {
  ...reportObject,
  regionId: 17,
  id: 17772,
}

const regionOneReportDistinctDate = {
  ...reportObject,
  startDate: '2000-06-01T12:00:00Z',
  endDate: '2000-06-02T12:00:00Z',
  regionId: 17,
  id: 17773,
  topics: ['Program Planning and Services', 'Recordkeeping and Reporting'],
}

const regionTwoReport = {
  ...reportObject,
  regionId: 18,
  id: 17774,
}

const regionOneReportWithDifferentTopics = {
  ...reportObject,
  topics: ['Coaching'],
  regionId: 17,
  id: 17775,
}

describe('Topics and frequency graph widget', () => {
  // Goals.
  let firstGoal
  let secondGoal
  let thirdGoal

  // Objectives.
  let firstGoalObjA
  let firstGoalObjB
  let secondGoalObjA
  let thirdGoalObjA

  // ARO's.
  let regionOneReportAroA
  let regionOneReportAroB
  let regionTwoReportAroA
  let regionOneReportDistinctDateAroA
  let regionOneReportWithDifferentTopicsAroA

  beforeAll(async () => {
    await User.bulkCreate([mockUser, mockUserTwo, mockUserThree])

    // Create Topics.
    const [coachingTopic] = await Topic.findOrCreate({
      where: {
        name: 'Coaching',
      },
    })
    const [communicationTopic] = await Topic.findOrCreate({
      where: {
        name: 'Communication',
      },
    })
    const [cultureAndLanguageTopic] = await Topic.findOrCreate({
      where: {
        name: 'Culture & Language',
      },
    })
    const [grantsSpecialist] = await Role.findOrCreate({
      where: {
        fullName: 'Grants Specialist',
        name: 'GS',
        isSpecialist: true,
        id: 5,
      },
    })

    // Find or create every topic in the TOPICS constant.
    await Promise.all(
      TOPICS.map(async (topicName) => {
        await Topic.findOrCreate({
          where: { name: topicName },
          defaults: { name: topicName },
        })
      })
    )

    const [systemSpecialist] = await Role.findOrCreate({
      where: {
        fullName: 'System Specialist',
        name: 'SS',
        isSpecialist: true,
        id: 16,
      },
    })

    await UserRole.create({
      userId: mockUser.id,
      roleId: grantsSpecialist.id,
    })

    await UserRole.create({
      userId: mockUserTwo.id,
      roleId: systemSpecialist.id,
    })

    await UserRole.create({
      userId: mockUserThree.id,
      roleId: grantsSpecialist.id,
    })

    await Recipient.create({ name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' })
    await Region.create({ name: 'office 17', id: 17 })
    await Region.create({ name: 'office 18', id: 18 })
    await Grant.create({
      id: GRANT_ID,
      number: GRANT_ID,
      recipientId: RECIPIENT_ID,
      regionId: 17,
      status: 'Active',
      startDate: new Date('2000/01/01'),
      endDate: new Date(),
    })

    // Create Goals.
    firstGoal = await Goal.create({
      name: 'First Topics Goal',
      status: 'In Progress',
      grantId: GRANT_ID,
      createdVia: 'activityReport',
    })

    secondGoal = await Goal.create({
      name: 'Second Topics Goal',
      status: 'In Progress',
      grantId: GRANT_ID,
      createdVia: 'activityReport',
    })

    thirdGoal = await Goal.create({
      name: 'Third Topics Goal',
      status: 'In Progress',
      grantId: GRANT_ID,
      createdVia: 'activityReport',
    })

    // Create Objectives.
    firstGoalObjA = await Objective.create({
      title: 'Topics Graph First Goal - Obj A',
      goalId: firstGoal.id,
      status: 'Not Started',
    })

    firstGoalObjB = await Objective.create({
      title: 'Topics Graph First Goal - Obj B',
      goalId: firstGoal.id,
      status: 'Not Started',
    })

    secondGoalObjA = await Objective.create({
      title: 'Topics Graph Second Goal - Obj A',
      goalId: secondGoal.id,
      status: 'Not Started',
    })

    thirdGoalObjA = await Objective.create({
      title: 'Topics Graph Third Goal - Obj A',
      goalId: thirdGoal.id,
      status: 'Not Started',
    })

    await ActivityReport.bulkCreate([regionOneReport, regionOneReportDistinctDate, regionTwoReport, regionOneReportWithDifferentTopics])

    // Create ARO's.
    // First ARO.
    regionOneReportAroA = await ActivityReportObjective.create({
      activityReportId: regionOneReport.id,
      objectiveId: firstGoalObjA.id,
      status: 'In Progress',
    })

    // First ARO A Topic.
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: regionOneReportAroA.id,
      topicId: coachingTopic.id,
    })

    regionOneReportAroB = await ActivityReportObjective.create({
      activityReportId: regionOneReport.id,
      objectiveId: firstGoalObjB.id,
      status: 'In Progress',
    })

    // First ARO B Topic's.
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: regionOneReportAroB.id,
      topicId: coachingTopic.id,
    })

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: regionOneReportAroB.id,
      topicId: communicationTopic.id,
    })

    // Region Two ARO.
    regionTwoReportAroA = await ActivityReportObjective.create({
      activityReportId: regionTwoReport.id,
      objectiveId: firstGoalObjA.id,
      status: 'In Progress',
    })

    // Region Two ARO A Topic.
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: regionTwoReportAroA.id,
      topicId: coachingTopic.id,
    })

    // Second ARO.
    regionOneReportDistinctDateAroA = await ActivityReportObjective.create({
      activityReportId: regionOneReportDistinctDate.id,
      objectiveId: secondGoalObjA.id,
      status: 'In Progress',
    })

    // Second ARO A Topic.
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: regionOneReportDistinctDateAroA.id,
      topicId: cultureAndLanguageTopic.id,
    })

    // Third ARO.
    regionOneReportWithDifferentTopicsAroA = await ActivityReportObjective.create({
      activityReportId: regionOneReportWithDifferentTopics.id,
      objectiveId: thirdGoalObjA.id,
      status: 'In Progress',
    })

    // Third ARO A Topic.
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: regionOneReportWithDifferentTopicsAroA.id,
      topicId: communicationTopic.id,
    })

    await ActivityReportCollaborator.create({
      id: 2000,
      activityReportId: 17772,
      userId: mockUserTwo.id,
    })

    await ActivityReportCollaborator.create({
      id: 2001,
      activityReportId: 17772,
      userId: mockUserThree.id,
    })

    await ActivityReportCollaborator.create({
      id: 2002,
      activityReportId: 17773,
      userId: mockUserTwo.id,
    })

    await ActivityReportCollaborator.create({
      id: 2003,
      activityReportId: 17774,
      userId: mockUserThree.id,
    })
  })

  afterAll(async () => {
    const ids = [17772, 17773, 17774, 17775]
    await NextStep.destroy({ where: { activityReportId: ids } })
    await ActivityRecipient.destroy({ where: { activityReportId: ids } })
    await ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId: [
          regionOneReportAroA.id,
          regionOneReportAroB.id,
          regionOneReportDistinctDateAroA.id,
          regionOneReportWithDifferentTopicsAroA.id,
          regionTwoReportAroA.id,
        ],
      },
    })
    await ActivityReportObjective.destroy({
      where: {
        objectiveId: [firstGoalObjA.id, firstGoalObjB.id, secondGoalObjA.id, thirdGoalObjA.id],
      },
    })
    await ActivityReport.destroy({ where: { id: ids } })
    await Objective.destroy({
      where: {
        id: [firstGoalObjA.id, firstGoalObjB.id, secondGoalObjA.id, thirdGoalObjA.id],
      },
      force: true,
    })
    await Goal.destroy({
      where: { id: [firstGoal.id, secondGoal.id, thirdGoal.id] },
      force: true,
    })
    await UserRole.destroy({
      where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] },
    })
    await User.destroy({ where: { id: [mockUser.id, mockUserTwo.id, mockUserThree.id] } })
    await Grant.destroy({
      where: { id: [GRANT_ID] },
      individualHooks: true,
    })
    await Recipient.destroy({
      where: { id: [RECIPIENT_ID] },
    })
    await Region.destroy({ where: { id: [17, 18] } })
    await ActivityReportCollaborator.destroy({
      where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] },
    })
    await db.sequelize.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns data in the correct format', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/01/01' }
    const scopes = await filtersToScopes(query)
    const data = await topicFrequencyGraph(scopes)

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 1,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 2, // 1 from AR 3 from ARO's.
      },
      {
        topic: 'Communication',
        count: 2, // 2 from ARO's.
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 0,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'Disabilities Services',
        count: 0,
      },
      {
        topic: 'Emergency Preparedness, Response, and Recovery (EPRR)',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fatherhood / Male Caregiving',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Ongoing Monitoring and Continuous Improvement',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 1,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 0,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Training and Professional Development',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ])
  })

  it('respects the region scope', async () => {
    const query = { 'region.in': [18], 'startDate.win': '2000/01/01-2000/01/01' }
    const scopes = await filtersToScopes(query)
    const data = await topicFrequencyGraph(scopes)

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 1,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 1,
      },
      {
        topic: 'Communication',
        count: 0,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 0,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'Disabilities Services',
        count: 0,
      },
      {
        topic: 'Emergency Preparedness, Response, and Recovery (EPRR)',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fatherhood / Male Caregiving',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Ongoing Monitoring and Continuous Improvement',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 1,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 0,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Training and Professional Development',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ])
  })

  it('respects the date scope', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/06/02' }
    const scopes = await filtersToScopes(query)
    const data = await topicFrequencyGraph(scopes)

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 1,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 2,
      },
      {
        topic: 'Communication',
        count: 2,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 1,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'Disabilities Services',
        count: 0,
      },
      {
        topic: 'Emergency Preparedness, Response, and Recovery (EPRR)',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fatherhood / Male Caregiving',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Ongoing Monitoring and Continuous Improvement',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 2,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 1,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Training and Professional Development',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ])
  })

  it('respects the role scope', async () => {
    const query = { 'region.in': [17], 'role.in': ['System Specialist'] }
    const scopes = await filtersToScopes(query)
    const data = await topicFrequencyGraph(scopes)
    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 1,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 1,
      },
      {
        topic: 'Communication',
        count: 1,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 1,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'Disabilities Services',
        count: 0,
      },
      {
        topic: 'Emergency Preparedness, Response, and Recovery (EPRR)',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fatherhood / Male Caregiving',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Ongoing Monitoring and Continuous Improvement',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 2,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 1,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Training and Professional Development',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ])
  })

  it("doesn't throw when likely no results (TTAHUB-2172)", async () => {
    const query = { 'region.in': [100], 'startDate.win': '2222/01/01-3000/01/01' }
    const scopes = await filtersToScopes(query)
    expect(() => topicFrequencyGraph(scopes)).not.toThrow()
  })
})
