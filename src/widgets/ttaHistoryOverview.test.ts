import ttaHistoryOverview from './ttaHistoryOverview';

jest.mock('./overview');
jest.mock('./trSessionsForRecipient');

import overview from './overview';
import trSessionsForRecipient from './trSessionsForRecipient';

const mockOverview = overview as jest.MockedFunction<typeof overview>;
const mockTrSessionsForRecipient = trSessionsForRecipient as jest.MockedFunction<typeof trSessionsForRecipient>;

const AR_DATA = {
  numReports: '5',
  numGrants: '3',
  numRecipients: '2',
  totalRecipients: '10',
  sumDuration: '12',
  inPerson: '2',
  numParticipants: '40',
  recipientPercentage: '20.00%',
  numOtherEntities: '0',
};

const SCOPES = {} as any;

describe('ttaHistoryOverview widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges AR overview data with numSessions and combined numParticipants', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '7', numParticipants: 13 });

    const result = await ttaHistoryOverview(SCOPES, {});

    // AR numParticipants 40 + TR numParticipants 13 = 53
    expect(result).toEqual({ ...AR_DATA, numParticipants: '53', numSessions: '7' });
  });

  it('numSessions from trSessionsForRecipient overwrites any numSessions from overview', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numSessions: 'should-be-overwritten' } as any);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '4', numParticipants: 0 });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numSessions).toBe('4');
  });

  it('strips thousands separators from numParticipants before summing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numParticipants: '1,234' });
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', numParticipants: 10 });

    const result = await ttaHistoryOverview(SCOPES, {});

    // 1,234 + 10 = 1,244, formatted with thousands separator. If commas were
    // not stripped, parseInt('1,234') would yield 1, so this confirms the
    // formatted string is parsed back to its full value before summing.
    expect(result.numParticipants).toBe('1,244');
  });

  it('falls back to 0 participants when AR numParticipants is missing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numParticipants: undefined } as any);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', numParticipants: 5 });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numParticipants).toBe('5');
  });

  it('calls both overview and trSessionsForRecipient with the same scopes', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', numParticipants: 0 });

    await ttaHistoryOverview(SCOPES, {});

    expect(mockOverview).toHaveBeenCalledWith(SCOPES);
    expect(mockTrSessionsForRecipient).toHaveBeenCalledWith(SCOPES);
  });
});
