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

  it('merges AR overview data with numSessions from trSessionsForRecipient', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '7' });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result).toEqual({ ...AR_DATA, numSessions: '7' });
  });

  it('numSessions from trSessionsForRecipient overwrites any numSessions from overview', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numSessions: 'should-be-overwritten' } as any);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '4' });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numSessions).toBe('4');
  });

  it('calls both overview and trSessionsForRecipient with the same scopes', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({ numSessions: '0' });

    await ttaHistoryOverview(SCOPES, {});

    expect(mockOverview).toHaveBeenCalledWith(SCOPES);
    expect(mockTrSessionsForRecipient).toHaveBeenCalledWith(SCOPES);
  });
});
