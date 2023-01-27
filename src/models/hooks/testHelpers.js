import crypto from 'crypto';
import faker from '@faker-js/faker';
import { REPORT_STATUSES, AUTOMATIC_CREATION, FILE_STATUSES } from '../../constants';

export const draftObject = {
  activityRecipientType: 'recipient',
  regionId: 1,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.DRAFT,
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
  creatorRole: 'TTAC',
};

export const approverUserIds = () => [
  faker.datatype.number({ min: 9064284 }),
  faker.datatype.number({ min: 9064284 }),
  faker.datatype.number({ min: 9064284 }),
];

export const mockApprovers = (ids) => ids.map((id) => ({
  id,
  hsesUserId: String(id),
  hsesUsername: `user${id}`,
}));

export const fileGenerator = (file = {}) => {
  const fn = faker.system.commonFileName();
  return {
    originalFileName: fn,
    key: fn,
    status: FILE_STATUSES.UPLOADED,
    fileSize: faker.datatype.number({ min: 10000 }),
    ...file,
  };
};

export const objectiveTemplateGenerator = (title, objectiveTemplate = {}) => {
  const secret = 'secret';
  const hash = crypto
    .createHmac('md5', secret)
    .update(title)
    .digest('hex');

  return {
    templateTitle: 'test',
    creationMethod: AUTOMATIC_CREATION,
    hash,
    regionId: 1,
    ...objectiveTemplate,
  };
};
