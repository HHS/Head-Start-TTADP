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

  it('merges AR overview data with numSessions and combined sumDuration', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '7', sumDuration: 3.5 });

    const result = await ttaHistoryOverview(SCOPES, {});

    // AR sumDuration "12" + TR sumDuration 3.5 = 15.5 (formatted with 1 decimal)
    expect(result).toEqual({ ...AR_DATA, sumDuration: '15.5', numSessions: '7' });
  });

  it('numSessions from trSessionsForRecipient overwrites any numSessions from overview', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numSessions: 'should-be-overwritten' } as any);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '4', sumDuration: 0 });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numSessions).toBe('4');
  });

  it('parses AR sumDuration with thousands separators before summing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, sumDuration: '1,234.5' });
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', sumDuration: 10 });

    const result = await ttaHistoryOverview(SCOPES, {});

    // 1234.5 + 10 = 1244.5
    expect(result.sumDuration).toBe('1,244.5');
  });

  it('falls back to 0 hours when AR sumDuration is missing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, sumDuration: undefined } as any);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', sumDuration: 2.5 });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.sumDuration).toBe('2.5');
  });

  it('calls both overview and trSessionsForRecipient with the same scopes', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0', sumDuration: 0 });

    await ttaHistoryOverview(SCOPES, {});

    expect(mockOverview).toHaveBeenCalledWith(SCOPES);
    expect(mockTrSessionsForRecipient).toHaveBeenCalledWith(SCOPES);
  });
});
