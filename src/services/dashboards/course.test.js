import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
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
} from '../../models';
import filtersToScopes from '../../scopes';
import { getCourseUrlWidgetData } from './course';

const RECIPIENT_ID = 46204400;
const GRANT_ID_ONE = 107843;
const REGION_ID = 14;

const mockUser = {
  id: faker.datatype.number({ min: 1000 }),
  homeRegionId: 1,
  name: 'user5426862',
  hsesUsername: 'user5426862',
  hsesUserId: '5426862',
  lastLogin: new Date(),
};

const mockRecipient = {
  name: 'recipient',
  id: RECIPIENT_ID,
  uei: 'NNA5N2KHMGN2XX',
};

const mockGrant = {
  id: GRANT_ID_ONE,
  number: `${GRANT_ID_ONE}`,
  recipientId: RECIPIENT_ID,
  regionId: REGION_ID,
  status: 'Active',
};

const mockGoal = {
  name: 'Goal 1',
  status: 'Draft',
  endDate: null,
  isFromSmartsheetTtaPlan: false,
  onApprovedAR: false,
  onAR: false,
  grantId: GRANT_ID_ONE,
  createdVia: 'rtr',
};

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { grantId: GRANT_ID_ONE },
  ],
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
};

const reportWithCourseA = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 1,
  startDate: '2021-01-02T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
  topics: ['Coaching', 'ERSEA'],
};

const reportWithCourseB = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 2,
  startDate: '2021-01-15T12:00:00Z',
  endDate: '2021-02-15T12:00:00Z',
  topics: ['Oral Health'],
};

const reportWithCourseOne = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 3,
  startDate: '2021-01-20T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
  topics: ['Nutrition'],
};

const reportWithoutCourses = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 3,
  startDate: '2021-01-22T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
  topics: ['Facilities', 'Fiscal / Budget', 'ERSEA'],
};

let grant;
let goal;
let goalTwo;
let objective;
let objectiveTwo;
let objectiveThree;
let aroMatchingA;
let aroMatchingATwo;
let aroMatchingAGoalTwo;
let aroMatchingB;
let aroOnlyCourseOne;
let aroNoCourses;

// Courses.
let courseOne;
let courseTwo;
let courseThree;
let reportIds;

describe('Course dashboard', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Recipient.create(mockRecipient);
    grant = await Grant.create(mockGrant);

    goal = await Goal.create({
      ...mockGoal,
      grantId: grant.id,
    });

    goalTwo = await Goal.create({
      ...mockGoal,
      grantId: grant.id,
      name: 'Goal 2',
    });

    objective = await Objective.create({
      title: 'Course Widget Objective 1',
      goalId: goal.id,
      status: 'Draft',
    });

    objectiveTwo = await Objective.create({
      title: 'Course Widget Objective 1 B',
      goalId: goal.id,
      status: 'Draft',
    });

    // This is on a different goal.
    objectiveThree = await Objective.create({
      title: 'Course Widget Goal 2 Objective 1',
      goalId: goalTwo.id,
      status: 'Draft',
    });

    // Create courses.
    courseOne = await Course.create({
      name: 'Widget Course 1',
    });

    courseTwo = await Course.create({
      name: 'Widget Course 2',
    });

    courseThree = await Course.create({
      name: 'Widget Course 3',
    });

    /*
        * Start: Create Report 1
        * Note: Report 1 ensure\'s we don\'t double count courses per Activity Report.
        * Goal 1 has 2 objectives (course 1, course 2, course 3).
        * Goal 2 has 1 objective (course 1 and course 3).
      */
    // Report 1.
    const reportOne = await ActivityReport.create({
      ...reportWithCourseA,
    }, {
      individualHooks: true,
    });

    // Report 1 ARO 1.
    aroMatchingA = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportOne.id,
      ttaProvided: 'course widget 1',
      status: 'In Progress',
    });

    // Report 1 ARO 2.
    aroMatchingATwo = await ActivityReportObjective.create({
      objectiveId: objectiveTwo.id,
      activityReportId: reportOne.id,
      ttaProvided: 'course widget 1B',
      status: 'In Progress',
    });

    // Report 1 ARO 1 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingA.id,
      courseId: courseOne.id,
    });

    // Report 1 ARO 1 Course 2.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingA.id,
      courseId: courseTwo.id,
    });

    // Report 1 ARO 1 Course 3.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingA.id,
      courseId: courseThree.id,
    });

    // Report 1 ARO 2 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingATwo.id,
      courseId: courseOne.id,
    });

    // Report 1 ARO for Goal 2.
    aroMatchingAGoalTwo = await ActivityReportObjective.create({
      objectiveId: objectiveThree.id,
      activityReportId: reportOne.id,
      ttaProvided: 'course widget 1',
      status: 'In Progress',
    });

    // Report 1 Goal 2 ARO 1 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingAGoalTwo.id,
      courseId: courseOne.id,
    });

    // Report 1 Goal 2 ARO 1 Course 3.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingAGoalTwo.id,
      courseId: courseThree.id,
    });

    /*
        * End: Create Report 1
     */
    // Crete Report 2.
    const reportTwo = await ActivityReport.create({
      ...reportWithCourseB,
    }, {
      individualHooks: true,
    });

    // Report 2 ARO 1.
    aroMatchingB = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportTwo.id,
      ttaProvided: 'course widget 2',
      status: 'In Progress',
    });

    // Report 2 Course 2.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingB.id,
      courseId: courseOne.id,
    });
    // Report 2 Course 3.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroMatchingB.id,
      courseId: courseTwo.id,
    });

    // Report without courses.
    const reportThree = await ActivityReport.create({
      ...reportWithoutCourses,
    }, {
      individualHooks: true,
    });

    // Report 4 with only course one.
    const reportFour = await ActivityReport.create({
      ...reportWithCourseOne,
    }, {
      individualHooks: true,
    });

    // Report 4 ARO 1.
    aroOnlyCourseOne = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: reportThree.id,
      ttaProvided: 'course resource widget 3',
      status: 'In Progress',
    });

    // Report 4 Course 1.
    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aroOnlyCourseOne.id,
      courseId: courseOne.id,
    });

    reportIds = [reportOne.id, reportTwo.id, reportThree.id, reportFour.id];
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);

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
    });

    await ActivityReportObjective.destroy({
      where: {
        objectiveId: [
          objective.id,
          objectiveTwo.id,
          objectiveThree.id,
        ],
      },
    });
    await ActivityReport.destroy({ where: { id: ids } });
    await Objective.destroy({
      where: {
        id:
        [
          objective.id, objectiveTwo.id, objectiveThree.id,
        ],
      },
      force: true,
    });
    await Goal.destroy({ where: { id: [goal.id, goalTwo.id] }, force: true });
    await Grant.destroy({ where: { id: GRANT_ID_ONE }, individualHooks: true });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID } });
    await Course.destroy({ where: { id: [courseOne.id, courseTwo.id, courseThree.id] } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves course count for ipd url\'s', async () => {
    const scopes = await filtersToScopes({
      'region.in': [REGION_ID],
      'startDate.win': '2021/01/01-2021/01/31',
      'reportId.in': reportIds,
    });

    const result = await getCourseUrlWidgetData(scopes);
    expect(result).not.toBeNull();

    const expectedResults = [
      {
        course: 'Widget Course 1',
        rollUpDate: 'Jan-21',
        count: '3',
        total: '3',
      },
      {
        course: 'Widget Course 2',
        rollUpDate: 'Jan-21',
        count: '2',
        total: '2',
      },
      {
        course: 'Widget Course 3',
        rollUpDate: 'Jan-21',
        count: '1',
        total: '1',
      },
    ];
    expect(result).toEqual(expectedResults);
  });
});
