import ActivityReportPolicy from '../../policies/activityReport';
import CollabReportPolicy from '../../policies/collabReport';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { collabReportById } from '../../services/collabReports';
import { userById } from '../../services/users';
import authorizeRoom from './authorizeRoom';

jest.mock('../../policies/activityReport');
jest.mock('../../policies/collabReport');
jest.mock('../../services/activityReports', () => ({
  activityReportAndRecipientsById: jest.fn(),
}));
jest.mock('../../services/collabReports', () => ({ collabReportById: jest.fn() }));
jest.mock('../../services/users', () => ({ userById: jest.fn() }));

const user = { userId: 3, username: 'Sam' };
const fullUser = { id: 3, permissions: [] };

const policyThat = (canGet: boolean) =>
  jest.fn().mockImplementation(() => ({ canGet: () => canGet }));

describe('authorizeRoom', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (userById as jest.Mock).mockResolvedValue(fullUser);
  });

  it('allows an activity report room when the user can get the report', async () => {
    const report = { id: 10 };
    (activityReportAndRecipientsById as jest.Mock).mockResolvedValue([report, [], []]);
    (ActivityReportPolicy as jest.Mock).mockImplementation(policyThat(true));

    expect(await authorizeRoom(user, 'ar-10')).toBe(true);
    expect(activityReportAndRecipientsById).toHaveBeenCalledWith('10');
    expect(ActivityReportPolicy).toHaveBeenCalledWith(fullUser, report);
  });

  it('denies an activity report room when the user cannot get the report', async () => {
    (activityReportAndRecipientsById as jest.Mock).mockResolvedValue([{ id: 10 }, [], []]);
    (ActivityReportPolicy as jest.Mock).mockImplementation(policyThat(false));

    expect(await authorizeRoom(user, 'ar-10')).toBe(false);
  });

  it('denies a room for a report that does not exist', async () => {
    (activityReportAndRecipientsById as jest.Mock).mockResolvedValue([null, [], []]);

    expect(await authorizeRoom(user, 'ar-10')).toBe(false);
    expect(ActivityReportPolicy).not.toHaveBeenCalled();
  });

  it('checks collaboration report rooms against the collab report policy', async () => {
    const report = { id: 4 };
    (collabReportById as jest.Mock).mockResolvedValue(report);
    (CollabReportPolicy as jest.Mock).mockImplementation(policyThat(true));

    expect(await authorizeRoom(user, 'cr-4')).toBe(true);
    expect(collabReportById).toHaveBeenCalledWith('4');
    expect(CollabReportPolicy).toHaveBeenCalledWith(fullUser, report);

    (CollabReportPolicy as jest.Mock).mockImplementation(policyThat(false));
    expect(await authorizeRoom(user, 'cr-4')).toBe(false);
  });

  it('denies when the user cannot be loaded', async () => {
    (userById as jest.Mock).mockResolvedValue(null);
    (collabReportById as jest.Mock).mockResolvedValue({ id: 4 });

    expect(await authorizeRoom(user, 'cr-4')).toBe(false);
  });

  it('denies unknown room types', async () => {
    expect(await authorizeRoom(user, 'tr-4')).toBe(false);
  });
});
