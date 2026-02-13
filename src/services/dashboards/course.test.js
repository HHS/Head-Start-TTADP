import faker from '@faker-js/faker'
import { REPORT_STATUSES } from '@ttahub/common'
import db, {
  ActivityReport,
  User,
  Recipient,
  Grant,
  Goal,
  Objective,
  ActivityReportObjective,
  Course,
  ActivityReportObjectiveCourse,
} from '../../models'
import filtersToScopes from '../../scopes'
import { getCourseUrlWidgetData, rollUpCourseUrlData } from './course'

const RECIPIENT_ID = faker.datatype.number({ min: 9999 })
const GRANT_ID_ONE = faker.datatype.number({ min: 9999 })
const REGION_ID = 14

const mockUser = {
  id: faker.datatype.number({ min: 9999 }),
  homeRegionId: 1,
  name: 'user5426862',
  hsesUsername: 'user5426862',
  hsesUserId: '5426862',
  lastLogin: new Date(),
}

const mockRecipient = {
  name: 'recipient',
  id: RECIPIENT_ID,
  uei: 'NNA5N2KHMGN2XX',
}

const mockGrant = {
  id: GRANT_ID_ONE,
  number: `${GRANT_ID_ONE}`,
  recipientId: RECIPIENT_ID,
  regionId: REGION_ID,
  status: 'Active',
}

const mockGoal = {
  name: 'Goal 1',
  status: 'Draft',
  isFromSmartsheetTtaPlan: false,
  onApprovedAR: false,
  onAR: false,
  grantId: GRANT_ID_ONE,
  createdVia: 'rtr',
}

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ grantId: GRANT_ID_ONE }],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['Coaching'],
  ttaType: ['technical-assistance'],
  version: 2,
}

const reportWithCourseA = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 1,
  startDate: '2025-01-02T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
  topics: ['Coaching', 'ERSEA'],
}

const reportWithCourseB = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 2,
  startDate: '2025-01-15T12:00:00Z',
  endDate: '2021-02-15T12:00:00Z',
  topics: ['Oral Health'],
}

const reportWithCourseOne = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 3,
  startDate: '2025-01-20T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
  topics: ['Nutrition'],
}

const reportWithoutCourses = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 3,
  startDate: '2025-01-22T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
  topics: ['Facilities', 'Fiscal / Budget', 'ERSEA'],
}

let grant
let goal
let goalTwo
let objective
let objectiveTwo
let objectiveThree
let aroMatchingA
let aroMatchingATwo
let aroMatchingAGoalTwo
let aroMatchingB
let aroOnlyCourseOne
let aroNoCourses

// Courses.
let courseOne
let courseTwo
let courseThree
let reportIds

describe('Course dashboard', () => {
  beforeAll(async () => {
    await User.create(mockUser)
    await Recipient.create(mockRecipient)
    grant = await Grant.create(mockGrant)

    goal = await Goal.create({
      ...mockGoal,
      grantId: grant.id,
    })

    goalTwo = await Goal.create({
      ...mockGoal,
      grantId: grant.id,
      name: 'Goal 2',
    })

    objective = await Objective.create({
      title: 'Course Widget Objective 1',
      goalId: goal.id,
      status: 'Draft',
    })

    objectiveTwo = await Objective.create({
      title: 'Course Widget Objective 1 B',
      goalId: goal.id,
      status: 'Draft',
    })

    // This is on a different goal.
    objectiveThree = await Objective.create({
      title: 'Course Widget Goal 2 Objective 1',
      goalId: goalTwo.id,
      status: 'Draft',
    })

    // Create courses.
    courseOne = await Course.create({
      name: 'Widget Course 1',
    })

    courseTwo = await Course.create({
      name: 'Widget Course 2',
    })

    courseThree = await Course.create({
      name: 'Widget Course 3',
    })

    // Report 1.
    const reportOne = await ActivityReport.create(
      {
        ...reportWithCourseA,
      },
      {
        individualHooks: true,
      }
    )

    // Report 1 ARO 1.
    aroMatchingA = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportOne.id,
      ttaProvided: 'course widget 1',
      status: 'In Progress',
    })

    // Report 1 ARO 2.
    aroMatchingATwo = await ActivityReportObjective.create({
      objectiveId: objectiveTwo.id,
      activityReportId: reportOne.id,
      ttaProvided: 'course widget 1B',
      status: 'In Progress',
    })

    // Report 1 ARO 1 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingA.id,
      courseId: courseOne.id,
    })

    // Report 1 ARO 1 Course 2.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingA.id,
      courseId: courseTwo.id,
    })

    // Report 1 ARO 1 Course 3.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingA.id,
      courseId: courseThree.id,
    })

    // Report 1 ARO 2 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingATwo.id,
      courseId: courseOne.id,
    })

    // Report 1 ARO for Goal 2.
    aroMatchingAGoalTwo = await ActivityReportObjective.create({
      objectiveId: objectiveThree.id,
      activityReportId: reportOne.id,
      ttaProvided: 'course widget 1',
      status: 'In Progress',
    })

    // Report 1 Goal 2 ARO 1 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingAGoalTwo.id,
      courseId: courseOne.id,
    })

    // Report 1 Goal 2 ARO 1 Course 3.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingAGoalTwo.id,
      courseId: courseThree.id,
    })

    // Crete Report 2.
    const reportTwo = await ActivityReport.create(
      {
        ...reportWithCourseB,
      },
      {
        individualHooks: true,
      }
    )

    // Report 2 ARO 1.
    aroMatchingB = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportTwo.id,
      ttaProvided: 'course widget 2',
      status: 'In Progress',
    })

    // Report 2 Course 2.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingB.id,
      courseId: courseOne.id,
    })
    // Report 2 Course 3.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingB.id,
      courseId: courseTwo.id,
    })

    // Report without courses.
    const reportThree = await ActivityReport.create(
      {
        ...reportWithoutCourses,
      },
      {
        individualHooks: true,
      }
    )

    aroNoCourses = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportThree.id,
      ttaProvided: 'course resource widget 4',
      status: 'In Progress',
    })

    // Report 4 with only course one.
    const reportFour = await ActivityReport.create(
      {
        ...reportWithCourseOne,
      },
      {
        individualHooks: true,
      }
    )

    // Report 4 ARO 1.
    aroOnlyCourseOne = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportFour.id,
      ttaProvided: 'course resource widget 3',
      status: 'In Progress',
    })

    // Report 4 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroOnlyCourseOne.id,
      courseId: courseOne.id,
    })

    reportIds = [reportOne.id, reportTwo.id, reportThree.id, reportFour.id]
  })

  afterAll(async () => {
    const reports = await ActivityReport.findAll({ where: { userId: [mockUser.id] } })
    const ids = reports.map((report) => report.id)

    await ActivityReportObjectiveCourse.destroy({
      where: {
        activityReportObjectiveId: [
          aroMatchingA.id,
          aroMatchingATwo.id,
          aroMatchingAGoalTwo.id,
          aroMatchingB.id,
          aroOnlyCourseOne.id,
          aroNoCourses.id,
        ],
      },
    })

    await ActivityReportObjective.destroy({
      where: {
        objectiveId: [objective.id, objectiveTwo.id, objectiveThree.id],
      },
    })
    await ActivityReport.destroy({ where: { id: ids } })
    await Objective.destroy({
      where: {
        id: [objective.id, objectiveTwo.id, objectiveThree.id],
      },
      force: true,
    })
    await Goal.destroy({ where: { id: [goal.id, goalTwo.id] }, force: true })
    await Grant.destroy({ where: { id: GRANT_ID_ONE }, individualHooks: true })
    await User.destroy({ where: { id: [mockUser.id] } })
    await Recipient.destroy({ where: { id: RECIPIENT_ID } })
    await Course.destroy({ where: { id: [courseOne.id, courseTwo.id, courseThree.id] } })
    await db.sequelize.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('retrieves course count', async () => {
    const scopes = await filtersToScopes({
      'region.in': [REGION_ID],
      'startDate.win': '2025/01/01-2025/01/31',
      'reportId.in': reportIds,
    })

    const result = await getCourseUrlWidgetData(scopes)
    expect(result).not.toBeNull()

    const { coursesAssociatedWithActivityReports } = result
    const { headers, courses } = coursesAssociatedWithActivityReports

    expect(headers).not.toBeNull()
    expect(headers.length).toBe(1)
    expect(headers[0]).toStrictEqual({ displayName: 'Jan-25', name: 'January 2025' })

    const expectedResults = [
      {
        heading: 'Widget Course 1',
        url: 'Widget Course 1',
        course: 'Widget Course 1',
        title: 'Widget Course 1',
        sortBy: 'Widget Course 1',
        total: '3',
        isUrl: false,
        data: [
          { title: 'Jan-25', value: '3', date: '2025-01-01' },
          { title: 'Total', value: '3' },
        ],
      },
      {
        heading: 'Widget Course 2',
        url: 'Widget Course 2',
        course: 'Widget Course 2',
        title: 'Widget Course 2',
        sortBy: 'Widget Course 2',
        total: '2',
        isUrl: false,
        data: [
          { title: 'Jan-25', value: '2', date: '2025-01-01' },
          { title: 'Total', value: '2' },
        ],
      },
      {
        heading: 'Widget Course 3',
        url: 'Widget Course 3',
        course: 'Widget Course 3',
        title: 'Widget Course 3',
        sortBy: 'Widget Course 3',
        total: '1',
        isUrl: false,
        data: [
          { title: 'Jan-25', value: '1', date: '2025-01-01' },
          { title: 'Total', value: '1' },
        ],
      },
    ]
    expect(courses).toEqual(expectedResults)
  })

  it('rolls up course data', async () => {
    const data = [
      {
        course: 'Widget Course 1',
        rollUpDate: 'Jan-21',
        count: '3',
        total: '4',
      },
      {
        course: 'Widget Course 1',
        rollUpDate: 'Feb-21',
        count: '1',
        total: '4',
      },
      {
        course: 'Widget Course 2',
        rollUpDate: 'Jan-21',
        count: '2',
        total: '5',
      },
      {
        course: 'Widget Course 2',
        rollUpDate: 'Feb-21',
        count: '3',
        total: '5',
      },
      {
        course: 'Widget Course 3',
        rollUpDate: 'Jan-21',
        count: '1',
        total: '1',
      },
      {
        course: 'Widget Course 3',
        rollUpDate: 'Feb-21',
        count: '0',
        total: '1',
      },
    ]

    const result = await rollUpCourseUrlData(data)

    const { headers, courses } = result

    expect(headers).not.toBeNull()
    expect(headers.length).toBe(2)
    expect(headers[0]).toStrictEqual({ displayName: 'Jan-21', name: 'January 2021' })
    expect(headers[1]).toStrictEqual({ displayName: 'Feb-21', name: 'February 2021' })

    expect(courses).not.toBeNull()
    expect(courses.length).toBe(3)
    expect(courses[0].data.length).toBe(3)
    expect(courses[1].data.length).toBe(3)
    expect(courses[2].data.length).toBe(3)

    const expectedResults = [
      {
        heading: 'Widget Course 2',
        url: 'Widget Course 2',
        course: 'Widget Course 2',
        title: 'Widget Course 2',
        sortBy: 'Widget Course 2',
        total: '5',
        isUrl: false,
        data: [
          { title: 'Jan-21', value: '2' },
          { title: 'Feb-21', value: '3' },
          { title: 'Total', value: '5' },
        ],
      },
      {
        heading: 'Widget Course 1',
        url: 'Widget Course 1',
        course: 'Widget Course 1',
        title: 'Widget Course 1',
        sortBy: 'Widget Course 1',
        total: '4',
        isUrl: false,
        data: [
          { title: 'Jan-21', value: '3' },
          { title: 'Feb-21', value: '1' },
          { title: 'Total', value: '4' },
        ],
      },
      {
        heading: 'Widget Course 3',
        url: 'Widget Course 3',
        course: 'Widget Course 3',
        title: 'Widget Course 3',
        sortBy: 'Widget Course 3',
        total: '1',
        isUrl: false,
        data: [
          { title: 'Jan-21', value: '1' },
          { title: 'Feb-21', value: '0' },
          { title: 'Total', value: '1' },
        ],
      },
    ]

    expect(courses).toEqual(expectedResults)
  })

  it('shows dashes for dates less than or equal to the cut off date', async () => {
    const data = [
      {
        course: 'Widget Course 1',
        rollUpDate: 'Mar-24',
        count: '0',
        total: '2',
        date: '2024-03-07',
      },
      {
        course: 'Widget Course 1',
        rollUpDate: 'Apr-24',
        count: '2',
        total: '2',
        date: '2024-04-10',
      },
    ]

    const result = await rollUpCourseUrlData(data)
    const { headers, courses } = result

    expect(headers.length).toBe(2)
    expect(headers[0]).toStrictEqual({ displayName: 'Mar-24', name: 'March 2024' })
    expect(headers[1]).toStrictEqual({ displayName: 'Apr-24', name: 'April 2024' })

    expect(courses).not.toBeNull()
    expect(courses.length).toBe(1)

    const expectedResults = [
      {
        heading: 'Widget Course 1',
        url: 'Widget Course 1',
        course: 'Widget Course 1',
        title: 'Widget Course 1',
        sortBy: 'Widget Course 1',
        total: '2',
        isUrl: false,
        data: [
          { title: 'Mar-24', value: '-', date: '2024-03-07' },
          { title: 'Apr-24', value: '2', date: '2024-04-10' },
          { title: 'Total', value: '2' },
        ],
      },
    ]
    expect(courses).toEqual(expectedResults)
  })
})
