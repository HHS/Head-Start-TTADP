import {
  sequelize,
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  File,
  Grant,
  NextStep,
  Permission,
  RequestErrors,
} from '../models';
import processData, { hideUsers, hideRecipientsGrants, bootstrapUsers } from './processData';
import { REPORT_STATUSES } from '../constants';

jest.mock('../logger');

const RECIPIENT_ID_ONE = 7777;
const RECIPIENT_ID_TWO = 7776;
const GRANT_ID_ONE = 88888;
const GRANT_ID_TWO = 88887;

const mockUser = {
  id: 3000,
  homeRegionId: 1,
  name: 'user3000',
  hsesUsername: 'user3000',
  hsesUserId: '3000',
  email: 'user3000@test.com',
};

const mockManager = {
  id: 3001,
  homeRegionId: 1,
  name: 'user3001',
  hsesUsername: 'user3001',
  hsesUserId: '3001',
  email: 'user3001@test.com',
};

const mockCollaboratorOne = {
  id: 3002,
  homeRegionId: 1,
  name: 'user3002',
  hsesUsername: 'user3002',
  hsesUserId: '3002',
  email: 'user3002@test.com',
};

const mockCollaboratorTwo = {
  id: 3003,
  homeRegionId: 1,
  name: 'user3003',
  hsesUsername: 'user3003',
  hsesUserId: '3003',
  email: 'user3003@test.com',
};

const mockFile = {
  id: 140000,
  activityReportId: 1,
  originalFileName: 'test.pdf',
  key: '508bdc9e-8dec-4d64-b83d-59a72a4f2353.pdf',
  status: 'APPROVED',
  fileSize: 54417,
};

const reportObject = {
  activityRecipientType: 'recipient',
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: RECIPIENT_ID_ONE },
    { activityRecipientId: RECIPIENT_ID_TWO },
  ],
  submissionStatus: REPORT_STATUSES.APPROVED,
  approvingManagerId: mockManager.id,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  imported: {
    additionalNotesForThisActivity: '',
    cdiGranteeName: '',
    contextForThisActivity: '',
    created: '11/02/20 4:47 PM',
    createdBy: 'user3000@test.com',
    duration: '2.5',
    endDate: '10/02/20',
    format: 'Virtual',
    goal1:
      'Collaboration with State Early Childhood stakeholders and other TTA systems to support the social emotional health of children, families and staff.',
    goal2: '',
    granteeFollowUpTasksObjectives: '',
    granteeName: 'Agency One, Inc. | 01GN011311\nAgency Two | 01GN011411',
    granteeParticipants: '',
    granteesLearningLevelGoal1: '',
    granteesLearningLevelGoal2: '',
    manager: 'user3001@test.com',
    managerApproval: 'Approved',
    modified: '01/08/21 1:38 PM',
    modifiedBy: 'user3001@test.com',
    multiGranteeActivities: '',
    nonGranteeActivity: '',
    nonGranteeParticipants:
      'HSCO\nRegional TTA Team / Specialists\nState Agency staff',
    nonOhsResources: '',
    numberOfParticipants: '',
    objective11:
      'Participants will have information on Head Start resources, policies and procedures that will support the social emotional well being of children, families and staff.',
    objective11Status: '',
    objective12: '',
    objective12Status: '',
    objective21: '',
    objective21Status: '',
    objective22: '',
    objective22Status: '',
    otherSpecialists: 'user3002@test.com, user3003@test.com',
    otherTopics: '',
    programType: '',
    reasons: 'Need: Professional Development\nNeed: School Readiness',
    reportId: 'R01-AR-000033',
    resourcesUsed: '',
    sourceOfRequest: 'Regional Office',
    specialistFollowUpTasksObjectives:
      'The next meeting will be November 6, 2020',
    startDate: '10/02/20',
    tTa: 'Technical Assistance',
    targetPopulations: 'Infant/Toddlers\nPreschool',
    topics:
      'Behavioral / Mental Health | HS, FES\nCLASS / Learning Environments / Classroom Management | ECS\nParent and Family Engagement | ECS, FES, HS',
    ttaProvidedAndGranteeProgressMade:
      'The CT Office of Early Childhood facilitated the meeting. The agenda included:\n•\tReview and completion of Benchmarks of Quality action plan\n•\tWork group reports: Governance, Family Engagement, Training, Marketing\nThe Office of Early Childhood shared the following information: a new project from the National Center for Pyramid Model Innovations on Equity that targets supporting coaches and programs that are implementing Pyramid; the Pyramid Facebook page; and resources on COVID-19 specific to Early Childhood programs. The training work group shared information about changes in program participation for both Cohort 1 & 2. The work group also shared that over 50 participants attended the Leadership Team training facilitated by CT Master Coaches. Dates for the entire cohort 2 training will be sent to members and all are encouraged to participate. The Governance work group asked for feedback on the posted changes to the governance document on Google Drive before the next meeting. The Family Engagement Work group will report on the upcoming Toolkit resources at the next meeting',
  },
};

describe('processData', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
    await User.findOrCreate({ where: mockManager });
    await User.findOrCreate({ where: mockCollaboratorOne });
    await User.findOrCreate({ where: mockCollaboratorTwo });

    await Recipient.findOrCreate({ where: { name: 'Agency One, Inc.', id: RECIPIENT_ID_ONE } });
    await Recipient.findOrCreate({ where: { name: 'Agency Two', id: RECIPIENT_ID_TWO } });
    await Grant.findOrCreate({
      where: {
        id: GRANT_ID_ONE,
        number: '01GN011311',
        recipientId: RECIPIENT_ID_ONE,
        regionId: 1,
        status: 'Active',
        programSpecialistName: mockManager.name,
        programSpecialistEmail: mockManager.email,
      },
    });
    await Grant.findOrCreate({
      where: {
        id: GRANT_ID_TWO, number: '01GN011411', recipientId: RECIPIENT_ID_TWO, regionId: 1, status: 'Active',
      },
    });
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({
      where: {
        userId: [
          mockUser.id,
          mockManager.id,
          mockCollaboratorOne.id,
          mockCollaboratorTwo.id,
        ],
      },
    });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await File.destroy({ where: { id: mockFile.id } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({
      where: {
        id: [
          mockUser.id,
          mockManager.id,
          mockCollaboratorOne.id,
          mockCollaboratorTwo.id,
        ],
      },
    });
    await Grant.destroy({ where: { id: GRANT_ID_ONE } });
    await Grant.destroy({ where: { id: GRANT_ID_TWO } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID_ONE } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID_TWO } });
    await sequelize.close();
  });

  it('transforms user emails, recipientName in the ActivityReports table (imported)', async () => {
    const report = await ActivityReport.create(reportObject);
    mockFile.activityReportId = report.id;
    const file = await File.create(mockFile);
    await processData(report);
    const transformedReport = await ActivityReport.findOne({ where: { id: report.id } });

    expect(transformedReport.imported.createdBy).not.toBe(mockUser.email);
    expect(transformedReport.imported.manager).not.toBe(mockManager.email);
    expect(transformedReport.imported.modifiedBy).not.toBe(mockManager.email);
    expect(transformedReport.imported.otherSpecialists).not.toBe(
      report.imported.otherSpecialists,
    );
    expect(transformedReport.imported.granteeName).not.toBe(report.imported.granteeName);

    const transformedFile = await File.findOne({ where: { id: file.id } });
    expect(transformedFile.originalFileName).not.toBe(mockFile.originalFileName);

    const requestErrors = await RequestErrors.findAll();
    expect(requestErrors.length).toBe(0);
  });

  describe('hideUsers', () => {
    it('transforms user names and emails in the Users table', async () => {
      await hideUsers(mockUser.id.toString());
      const transformedMockUser = await User.findOne({ where: { id: mockUser.id } });
      expect(transformedMockUser.email).not.toBe(mockUser.email);
      expect(transformedMockUser.hsesUsername).not.toBe(mockUser.hsesUsername);
      expect(transformedMockUser.name).not.toBe(mockUser.name);
      expect(transformedMockUser.phoneNumber).not.toBe(mockUser.phoneNumber);
    });
  });

  describe('hideRecipientsGrants', () => {
    it('transforms recipient names in the Recipients table', async () => {
      await hideRecipientsGrants(reportObject.imported.granteeName);

      const transformedRecipient = await Recipient.findOne({ where: { id: RECIPIENT_ID_ONE } });
      expect(transformedRecipient.name).not.toBe('Agency One, Inc.');
    });
    it('transforms grant names in the Grants table', async () => {
      await hideRecipientsGrants(reportObject.imported.granteeName);

      const transformedGrant = await Grant.findOne({ where: { recipientId: RECIPIENT_ID_ONE } });
      expect(transformedGrant.number).not.toBe('01GN011311');
    });

    it('transforms program specialist name and email in the Grants table', async () => {
      await hideRecipientsGrants(reportObject.imported.granteeName);

      const transformedGrant = await Grant.findOne({ where: { recipientId: RECIPIENT_ID_ONE } });
      expect(transformedGrant.id).toBe(GRANT_ID_ONE);
      const transformedMockManager = await User.findOne({ where: { id: mockManager.id } });

      expect(transformedGrant.programSpecialistName).toBe(transformedMockManager.name);
      expect(transformedGrant.programSpecialistEmail).toBe(transformedMockManager.email);
    });
  });

  describe('bootstrapUsers', () => {
    it('creates a user if it does not exist', async () => {
      await bootstrapUsers();

      const user = await User.findOne({ where: { hsesUserId: '51113' } });

      expect(user.homeRegionId).toBe(14);
    });
    it('gives permissions to users', async () => {
      await bootstrapUsers();

      const user = await User.findOne({ where: { hsesUserId: '51113' } });
      const userPermissions = await Permission.findAll({ where: { userId: user.id } });
      expect(userPermissions.length).toBe(16);
    });
  });
});
