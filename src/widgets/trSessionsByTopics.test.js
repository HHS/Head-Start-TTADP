import faker from '@faker-js/faker';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db, {
  EventReportPilot,
  SessionReportPilot,
  Recipient,
  Topic,
  Grant,
  User,
} from '../models';
import {
  createUser,
  createGrant,
  createRecipient,
  createSessionReport,
  createTrainingReport,
} from '../testUtils';
import trSessionsByTopic from './trSessionsByTopic';

// We need to mock this so that we don't try to send emails or otherwise engage the queue
jest.mock('bull');

describe('TR sessions by topic', () => {
  let userCreator;
  let userPoc;
  let userCollaborator;

  let recipient1;
  let recipient2;
  let recipient3;
  let recipient4;
  let recipient5;

  let grant1;
  let grant2;
  let grant3;
  let grant4;
  let grant5;

  let trainingReport1;
  let trainingReport2;
  let trainingReport3;

  let topic1;
  let topic2;

  beforeAll(async () => {
    // user/creator
    userCreator = await createUser();
    // user/poc
    userPoc = await createUser();
    // user/collaborator ID
    userCollaborator = await createUser();

    // recipient 1
    recipient1 = await createRecipient();
    // recipient 2
    recipient2 = await createRecipient();
    // recipient 3
    recipient3 = await createRecipient();
    // recipient 4
    recipient4 = await createRecipient();
    // recipient 5 (only on uncompleted report)
    recipient5 = await createRecipient();

    // grant 1
    grant1 = await createGrant({ recipientId: recipient1.id, regionId: userCreator.homeRegionId });
    // grant 2
    grant2 = await createGrant({ recipientId: recipient2.id, regionId: userCreator.homeRegionId });
    // grant 3
    grant3 = await createGrant({ recipientId: recipient3.id, regionId: userCreator.homeRegionId });
    // grant 4
    grant4 = await createGrant({ recipientId: recipient4.id, regionId: userCreator.homeRegionId });
    // grant 5 (only on uncompleted report)
    grant5 = await createGrant({ recipientId: recipient5.id, regionId: userCreator.homeRegionId });

    topic1 = await Topic.create({
      name: faker.word.conjunction(5) + faker.word.adjective(3) + faker.word.noun(4),
    });

    topic2 = await Topic.create({
      name: faker.word.conjunction(3) + faker.word.adjective(4) + faker.word.noun(5),
    });

    // training report 1
    trainingReport1 = await createTrainingReport({
      collaboratorIds: [userCollaborator.id],
      pocIds: [userPoc.id],
      ownerId: userCreator.id,
      data: {
        reasons: [
          'Monitoring | Area of Concern',
          'Monitoring | Noncompliance',
          'Monitoring | Deficiency',
        ],
      },
    });

    // - session report 1
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        objectiveTopics: [],
      },
    });

    // - session report 2
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        objectiveTopics: [
          topic1.name,
        ],
      },
    });

    // training report 2
    trainingReport2 = await createTrainingReport({
      collaboratorIds: [userCollaborator.id],
      pocIds: [userPoc.id],
      ownerId: userCreator.id,
      data: {
        reasons: [
          'Monitoring | Area of Concern',
          'Monitoring | Deficiency',
        ],
      },
    });

    // - session report 3
    await createSessionReport({
      eventId: trainingReport2.id,
      data: {
        deliveryMethod: 'hybrid',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 12,
        numberOfParticipantsInPerson: 13,
        numberOfParticipants: 0,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        objectiveTopics: [
          topic2.name,
        ],
      },
    });

    // - session report 4
    await createSessionReport({
      eventId: trainingReport2.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant2.id }, { value: grant3.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        objectiveTopics: [],
      },
    });

    // training report 3 (sessions not completed)
    trainingReport3 = await createTrainingReport({
      collaboratorIds: [userCollaborator.id],
      pocIds: [userPoc.id],
      ownerId: userCreator.id,
    }, { individualHooks: false });

    // - session report 5
    await createSessionReport({
      eventId: trainingReport3.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        objectiveTopics: [
          topic1.name,
          topic2.name,
        ],
      },
    });

    // - session report 6
    await createSessionReport({
      eventId: trainingReport3.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    // update TR 1 to complete, the others will be "in progress" as they have sessions
    await trainingReport1.update({
      data: {
        ...trainingReport1.data,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });
  });

  afterAll(async () => {
    // delete session reports
    await SessionReportPilot.destroy({
      where: {
        eventId: [trainingReport1.id, trainingReport2.id, trainingReport3.id],
      },
    });

    // delete training reports
    await EventReportPilot.destroy({
      where: {
        id: [trainingReport1.id, trainingReport2.id, trainingReport3.id],
      },
    });

    await db.GrantNumberLink.destroy({
      where: {
        grantId: [grant1.id, grant2.id, grant3.id, grant4.id, grant5.id],
      },
      force: true,
    });

    // delete grants
    await Grant.destroy({
      where: {
        id: [grant1.id, grant2.id, grant3.id, grant4.id, grant5.id],
      },
      individualHooks: true,
    });

    // delete recipients
    await Recipient.destroy({
      where: {
        id: [recipient1.id, recipient2.id, recipient3.id, recipient4.id, recipient5.id],
      },
    });

    // delete users
    await User.destroy({
      where: {
        id: [userCreator.id, userPoc.id, userCollaborator.id],
      },
    });

    await Topic.destroy({
      where: {
        id: [topic1.id, topic2.id],
      },
      individualHooks: true,
      force: true,
    });

    await db.sequelize.close();
  });

  it('filters and calculates sessions by topics', async () => {
    // Confine this to the grants and reports that we created
    const scopes = {
      grant: [
        { id: [grant1.id, grant2.id, grant3.id, grant4.id, grant5.id] },
      ],
      trainingReport: [
        { id: [trainingReport1.id, trainingReport2.id, trainingReport3.id] },
      ],
    };

    // run our function
    const data = await trSessionsByTopic(scopes);

    const firstTopic = data.find((d) => topic1.name === d.topic);
    expect(firstTopic.count).toBe(1);

    const secondTopic = data.find((d) => topic2.name === d.topic);
    expect(secondTopic.count).toBe(1);
  });

  it('handles topics that are not in the topics list', async () => {
    // eslint-disable-next-line global-require
    const helpers = require('./helpers');
    const originalFindAll = db.EventReportPilot.findAll;
    const originalGetAllTopics = helpers.getAllTopicsForWidget;
    const originalBaseTRScopes = helpers.baseTRScopes;

    const nonExistentTopic = 'Non-existent Topic';
    const mockReports = [{
      sessionReports: [{
        data: {
          objectiveTopics: [nonExistentTopic, topic1.name],
        },
      }],
    }];

    const mockTopics = [
      { name: topic1.name },
    ];

    db.EventReportPilot.findAll = jest.fn().mockResolvedValue(mockReports);
    helpers.getAllTopicsForWidget = jest.fn().mockResolvedValue(mockTopics);
    helpers.baseTRScopes = jest.fn().mockReturnValue({
      where: {},
      include: {
        model: SessionReportPilot,
        as: 'sessionReports',
        attributes: ['data', 'eventId'],
        where: {
          'data.status': TRAINING_REPORT_STATUSES.COMPLETE,
        },
        required: true,
      },
    });

    const scopes = {
      grant: [{ id: [grant1.id] }],
      trainingReport: [{ id: [trainingReport1.id] }],
    };
    const data = await trSessionsByTopic(scopes);

    expect(data.length).toBe(1);
    expect(data[0].topic).toBe(topic1.name);
    expect(data[0].count).toBe(1);

    const nonExistentTopicInResult = data.find((d) => d.topic === nonExistentTopic);
    expect(nonExistentTopicInResult).toBeUndefined();

    db.EventReportPilot.findAll = originalFindAll;
    helpers.getAllTopicsForWidget = originalGetAllTopics;
    helpers.baseTRScopes = originalBaseTRScopes;
  });
});
