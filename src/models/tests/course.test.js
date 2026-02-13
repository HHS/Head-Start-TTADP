import { REPORT_STATUSES } from '@ttahub/common'
import db, {
  User,
  Course,
  Recipient,
  Grant,
  Goal,
  Objective,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCourse,
} from '..'

const mockUser = {
  name: 'Tim Test',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65536',
  hsesUsername: 'test50@test50.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'timtest50@test50.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      regionId: 1,
      scopeId: 1,
    },
    {
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
}

const mockGrant = {
  regionId: 1,
  status: 'Active',
  startDate: new Date('2023-02-09T15:13:00.000Z'),
  endDate: new Date('2023-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
}

const sampleReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  activityRecipientType: 'test',
  creatorRole: 'COR',
  topics: ['topic'],
  participants: ['test'],
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  ttaType: ['type'],
  regionId: 2,
  targetPopulations: ['target pop'],
  author: {
    fullName: 'Kiwi, GS',
    name: 'Kiwi',
    role: 'Grants Specialist',
    homeRegionId: 1,
  },
  version: 2,
}

describe('course', () => {
  let user
  let course
  let updateCourse
  let report
  let recipient
  let grant
  let goal
  let objective
  let activityReportGoal
  let activityReportObjective
  let activityReportObjectiveCourse

  beforeAll(async () => {
    // Create mock user.
    user = await User.create({ ...mockUser })

    // Create recipient.
    recipient = await Recipient.create({
      id: 534935,
      uei: 'NNA5N2KGHGM2',
      name: 'IPD Recipient',
      recipientType: 'IPD Recipient',
    })

    // Create grant.
    grant = await Grant.create({
      ...mockGrant,
      id: 472968,
      number: '28978D82',
      recipientId: recipient.id,
      programSpecialistName: user.name,
      programSpecialistEmail: user.email,
    })

    // Create goal.
    goal = await Goal.create({
      name: 'ipd course goal 1',
      grantId: grant.id,
    })

    // Create objective.
    objective = await Objective.create({
      title: 'IPD course objective ',
      goalId: goal.id,
      status: 'Not Started',
    })

    // Create activity report.
    report = await ActivityReport.create(sampleReport)

    // Create activity report goal.
    activityReportGoal = await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal.id,
      isActivelyEdited: false,
    })

    // Create activity report objective.
    activityReportObjective = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: report.id,
      ttaProvided: 'ipd aro Goal',
      status: objective.status,
    })

    course = await Course.create({
      name: 'Test IpdCourse',
      nameLookUp: 'testipdCourse',
    })

    // Create another course.
    updateCourse = await Course.create({
      name: 'Test IpdCourse 2',
      nameLookUp: 'testipdcourse2',
    })

    // Create ActivityReportObjectiveCourse.
    activityReportObjectiveCourse = await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: activityReportObjective.id,
      courseId: course.id,
    })
  })

  afterAll(async () => {
    // Delete ActivityReportObjectiveCourse.
    await ActivityReportObjectiveCourse.destroy({
      where: {
        id: activityReportObjectiveCourse.id,
      },
    })

    // Delete Course.
    await Course.destroy({
      where: {
        id: [course.id, updateCourse.id],
      },
      force: true,
    })

    // Delete activity report objective.
    await ActivityReportObjective.destroy({
      where: {
        id: activityReportObjective.id,
      },
    })

    // Delete activity report goal.
    await ActivityReportGoal.destroy({
      where: {
        id: activityReportGoal.id,
      },
    })

    // Delete activity report.
    await ActivityReport.destroy({
      where: {
        id: report.id,
      },
    })

    // Delete objective.
    await Objective.destroy({
      where: {
        id: objective.id,
      },
      force: true,
    })

    // Delete goal.
    await Goal.destroy({
      where: {
        id: goal.id,
      },
      force: true,
    })

    // Delete grant.
    await Grant.destroy({
      where: {
        id: grant.id,
      },
      force: true,
      individualHooks: true,
    })

    // Delete recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    })

    // Delete mock user.
    await User.destroy({
      where: {
        id: user.id,
      },
    })

    await db.sequelize.close()
  })

  it('Update Course', async () => {
    const newCourseName = 'Test IpdCourse Updated'
    course.name = newCourseName
    await course.update(
      {
        name: newCourseName,
      },
      {
        where: {
          id: course.id,
        },
      }
    )
    course = await Course.findByPk(course.id)
    expect(course.name).toBe(newCourseName)
  })

  it('ActivityReportObjective course', async () => {
    const aroCourse = await ActivityReportObjectiveCourse.findOne({
      where: {
        activityReportObjectiveId: activityReportObjective.id,
      },
    })
    expect(aroCourse.courseId).toBe(course.id)

    // Update activity report objective course.
    aroCourse.courseId = updateCourse.id
    await ActivityReportObjectiveCourse.update(
      {
        courseId: updateCourse.id,
      },
      {
        where: {
          id: aroCourse.id,
        },
      }
    )
    const updatedAroCourse = await ActivityReportObjectiveCourse.findByPk(aroCourse.id)
    expect(updatedAroCourse.courseId).toBe(updateCourse.id)
  })
})
