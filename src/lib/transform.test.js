import { REPORT_STATUSES } from '../constants';
import {
  ActivityReport,
  User,
  ActivityRecipient,
  Collaborator,
  Grant,
  Recipient,
} from '../models';
import { activityReportToCsvRecord, makeGoalsAndObjectivesObject, extractListOfGoalsAndObjectives } from './transform';

describe('activityReportToCsvRecord', () => {
  const mockAuthor = {
    id: 2099,
    name: 'Arthur',
    hsesUserId: '2099',
    hsesUsername: 'arthur.author',
  };

  const mockCollaborators = [
    {
      user: {
        id: 2100,
        name: 'Collaborator 1',
        hsesUserId: '2100',
        hsesUsername: 'collaborator.one',
      },
    },
    {
      user: {
        id: 2101,
        name: 'Collaborator 2',
        hsesUserId: '2101',
        hsesUsername: 'collaborator.two',
        role: [],
      },
    },
  ];

  const mockGoals = [
    {
      name: 'Goal 1',
      id: 2080,
      status: 'Not Started',
      grantId: 1,
      timeframe: 'None',
    },
    {
      name: 'Goal 2',
      id: 2081,
      status: 'Not Started',
      grantId: 1,
      timeframe: 'None',
    },
    {
      name: 'Goal 3',
      id: 2082,
      status: 'Not Started',
      grantId: 1,
      timeframe: 'None',
    },
    {
      name: 'Goal 3',
      id: 2083,
      status: 'Not Started',
      grantId: 2,
      timeframe: 'None',
    },
  ];

  const mockObjectives = [
    {
      id: 11,
      title: 'Objective 1.1',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[0],
    },
    {
      id: 12,
      title: 'Objective 1.2',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[0],
    },
    {
      id: 13,
      title: 'Objective 2.1',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[1],
    },
    {
      id: 14,
      title: 'Objective 2.2',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[1],
    },
    {
      id: 15,
      title: 'Objective 2.3',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[1],
    },
    {
      id: 16,
      title: 'Objective 3.1',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[2],
    },
    {
      id: 17,
      title: 'Objective 3.1',
      ttaProvided: 'Training',
      status: 'Completed',
      goal: mockGoals[2],
    },
  ];

  const mockApprovers = [
    {
      activityReportId: 209914,
      status: 'approved',
      userId: 3,
      User: {
        name: 'Test Approver 1',

      },
    },
    {
      activityReportId: 209914,
      status: 'approved',
      userId: 4,
      User: {
        name: 'Test Approver 3',

      },
    },
    {

      activityReportId: 209914,
      status: 'approved',
      userId: 5,
      User: {
        name: 'Test Approver 2',

      },
    },
  ];

  const mockActivityRecipients = [
    {
      id: 4,
      grantId: 4,
      grant: {
        name: 'test4', programSpecialistName: 'Program Specialist 4', recipientId: 4, number: 'grant number 4', recipient: { id: 4, name: 'test4' },
      },
    },
    {
      id: 1,
      grantId: 1,
      grant: {
        name: 'test1', programSpecialistName: 'Program Specialist 1', recipientId: 1, number: 'grant number 1', recipient: { id: 1, name: 'test1' },
      },
    },
    {
      id: 2,
      grantId: 2,
      grant: {
        name: 'test2', programSpecialistName: 'Program Specialist 2', recipientId: 2, number: 'grant number 2', recipient: { id: 2, name: 'test2' },
      },
    },
    {
      id: 3,
      grantId: 3,
      grant: {
        name: 'test3', programSpecialistName: 'Program Specialist 1', recipientId: 3, number: 'grant number 3', recipient: { id: 3, name: 'test3' },
      },
    },
  ];

  const mockReport = {
    id: 209914,
    regionId: 14,
    reason: ['Test CSV Export'],
    submissionStatus: 'approved',
    calculatedStatus: REPORT_STATUSES.APPROVED,
    numberOfParticipants: 12,
    deliveryMethod: 'virtual',
    duration: 4.5,
    startDate: '2021-10-31',
    endDate: '2021-11-03',
    ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
    nonECLKCResourcesUsed: ['one', 'two'],
    author: mockAuthor,
    lastUpdatedBy: mockAuthor,
    activityReportCollaborators: mockCollaborators,
    approvedAt: new Date(),
    activityRecipients: mockActivityRecipients,
    approvers: mockApprovers,
  };

  it('transforms arrays of strings into strings', async () => {
    const report = ActivityReport.build({
      ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
      nonECLKCResourcesUsed: ['one', 'two'],
    });
    const output = await activityReportToCsvRecord(report);
    const expectedOutput = {
      ECLKCResourcesUsed: 'https://one.test\nhttps://two.test',
      nonECLKCResourcesUsed: 'one\ntwo',
    };
    expect(output).toMatchObject(expectedOutput);
  });

  describe('HTML Tag removal', () => {
    it('removes tags from the context field', async () => {
      const report = ActivityReport.build({
        context: '<p data-attribute="test">test text</p>',
      });
      const output = await activityReportToCsvRecord(report);
      const expectedOutput = {
        context: 'test text',
      };
      expect(output).toMatchObject(expectedOutput);
    });

    it('handles ordered lists', async () => {
      const report = ActivityReport.build({
        context: `
        <ol>
          <li>first</li>
          <li>second</li>
        </ol>
        `,
      });
      const output = await activityReportToCsvRecord(report);
      const expectedOutput = {
        context: ' 1. first\n 2. second',
      };
      expect(output).toMatchObject(expectedOutput);
    });

    it('handles nested lists', async () => {
      const report = ActivityReport.build({
        context: `
        <ol>
          <li>
            <ol>
              <li>
                one
              </li>
              <li>
                two
              </li>
            </ol>
          </li>
          <li>second</li>
        </ol>
        `,
      });
      const output = await activityReportToCsvRecord(report);
      const expectedOutput = {
        context: ' 1. 1. one\n    2. two\n 2. second',
      };
      expect(output).toMatchObject(expectedOutput);
    });

    it('handles unordered lists', async () => {
      const report = ActivityReport.build({
        context: `
        <ul>
          <li>first</li>
          <li>second</li>
        </ul>
        `,
      });
      const output = await activityReportToCsvRecord(report);
      const expectedOutput = {
        context: ' * first\n * second',
      };
      expect(output).toMatchObject(expectedOutput);
    });

    it('handles tables', async () => {
      const report = ActivityReport.build({
        context: `
        <table>
          <thead>
            <tr>
              <td>First</td>
              <td>Second</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>One</td>
              <td>Two</td>
            </tr>
            <tr>
              <td>Three</td>
              <td>Four</td>
            </tr>
          </tbody>
        </table>
        `,
      });
      const output = await activityReportToCsvRecord(report);
      const expectedOutput = {
        context: 'First   Second\nOne     Two\nThree   Four',
      };
      expect(output).toMatchObject(expectedOutput);
    });
  });

  it('transforms related models into string values', async () => {
    const report = await ActivityReport.build(mockReport, {
      include: [
        {
          model: Collaborator,
          as: 'owner',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'role', 'fullName'],
          }],
        },
        { model: User, as: 'lastUpdatedBy' },
        {
          model: Collaborator,
          as: 'collaborators',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'role', 'fullName'],
          }],
        },
        {
          model: ActivityRecipient,
          as: 'activityRecipients',
          include: [{ model: Grant, as: 'grant', include: [{ model: Recipient, as: 'recipient' }] }],
        },
        {
          model: Collaborator,
          as: 'approvers',
          include: [{ model: User, as: 'user' }],
        }],
    });

    const output = await activityReportToCsvRecord(report);
    const {
      creatorName, lastUpdatedBy, collaborators, programSpecialistName, approvers, recipientInfo,
    } = output;
    expect(creatorName).toEqual('Arthur');
    expect(lastUpdatedBy).toEqual('Arthur');
    expect(collaborators).toEqual('Collaborator 1\nCollaborator 2');
    expect(programSpecialistName).toEqual('Program Specialist 1\nProgram Specialist 2\nProgram Specialist 4');
    expect(approvers).toEqual('Test Approver 1\nTest Approver 2\nTest Approver 3');
    expect(recipientInfo).toEqual('test1 - grant number 1 - 1\ntest2 - grant number 2 - 2\ntest3 - grant number 3 - 3\ntest4 - grant number 4 - 4');
  });

  it('transforms goals and objectives into many values', () => {
    const objectives = mockObjectives.map((mo) => ({
      ...mo,
      activityReportObjectives: [{
        ttaProvided: mo.ttaProvided,
      }],
    }));

    const output = makeGoalsAndObjectivesObject(objectives);
    expect(output).toEqual({
      'goal-1': 'Goal 1',
      'goal-1-status': 'Not Started',
      'objective-1.1': 'Objective 1.1',
      'objective-1.1-ttaProvided': 'Training',
      'objective-1.1-status': 'Completed',
      'objective-1.2': 'Objective 1.2',
      'objective-1.2-ttaProvided': 'Training',
      'objective-1.2-status': 'Completed',
      'goal-2': 'Goal 2',
      'goal-2-status': 'Not Started',
      'objective-2.1': 'Objective 2.1',
      'objective-2.1-ttaProvided': 'Training',
      'objective-2.1-status': 'Completed',
      'objective-2.2': 'Objective 2.2',
      'objective-2.2-ttaProvided': 'Training',
      'objective-2.2-status': 'Completed',
      'objective-2.3': 'Objective 2.3',
      'objective-2.3-ttaProvided': 'Training',
      'objective-2.3-status': 'Completed',
      'goal-3': 'Goal 3',
      'goal-3-status': 'Not Started',
      'objective-3.1': 'Objective 3.1',
      'objective-3.1-ttaProvided': 'Training',
      'objective-3.1-status': 'Completed',
    });
  });

  it('return a list of all keys that are a goal or objective and in the proper order', () => {
    const csvData = [
      {
        'goal-1': 'butter',
        'objective-1': 'cream',
      },
      {
        'goal-1': 'butter',
        'objective-1': 'cream',
        'goal-2': 'cream',
        'goal-2-status': 'butter',
        'objective-2.1': 'eggs',
        'objective-2.1-ttaProvided': 'cream',
      },
      {
        'goal-3': 'butter',
        'objective-3.1-status': 'cream',
        kitchen: 'test',
      },
    ];

    const validated = extractListOfGoalsAndObjectives(csvData);

    expect(validated).toStrictEqual([
      'goal-1', 'objective-1', 'goal-2', 'goal-2-status', 'objective-2.1', 'objective-2.1-ttaProvided', 'goal-3', 'objective-3.1-status',
    ]);
  });

  it('does not provide values for builders that are not strings or functions', async () => {
    const report = await ActivityReport.build(mockReport, { include: [{ model: User, as: 'author' }, { model: User, as: 'lastUpdatedBy' }] });
    const output = await activityReportToCsvRecord(report, [1, true, 'regionId']);
    expect(output).toMatchObject({ regionId: 14 });
  });
});
