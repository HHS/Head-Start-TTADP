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
  numParticipantsRaw: 40,
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

    // AR numParticipantsRaw 40 + TR numParticipants 13 = 53
    expect(result).toEqual({ ...AR_DATA, numParticipants: '53', numSessions: '7' });
  });

  it('numSessions from trSessionsForRecipient overwrites any numSessions from overview', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numSessions: 'should-be-overwritten' } as any);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '4', numParticipants: 0 });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numSessions).toBe('4');
  });

  it('uses numParticipantsRaw to sum AR and TR participants without string parsing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numParticipantsRaw: 1234, numParticipants: '1,234' });
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', numParticipants: 10 });

    const result = await ttaHistoryOverview(SCOPES, {});

    // 1234 + 10 = 1244, formatted with thousands separator. If the widget had
    // fallen back to string parsing, "1,234" would parse as NaN or 1, so this
    // value confirms the raw numeric path is being used.
    expect(result.numParticipants).toBe('1,244');
  });

  it('falls back to 0 participants when AR numParticipantsRaw is missing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numParticipantsRaw: undefined } as any);
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
