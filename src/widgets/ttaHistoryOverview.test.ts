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

  it('merges AR overview data with numSessions, combined sumDuration, combined numParticipants, and combined inPerson', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '7',
      sumDuration: 3.5,
      numParticipants: 13,
      numInPerson: 4,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    // AR sumDuration "12" + TR sumDuration 3.5 = 15.5 (formatted with 1 decimal)
    // AR numParticipants 40 + TR numParticipants 13 = 53
    // AR inPerson 2 + TR numInPerson 4 = 6
    expect(result).toEqual({
      ...AR_DATA,
      sumDuration: '15.5',
      numParticipants: '53',
      inPerson: '6',
      numSessions: '7',
    });
  });

  it('numSessions from trSessionsForRecipient overwrites any numSessions from overview', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numSessions: 'should-be-overwritten' } as any);
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '4',
      sumDuration: 0,
      numParticipants: 0,
      numInPerson: 0,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numSessions).toBe('4');
  });

  it('parses AR sumDuration with thousands separators before summing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, sumDuration: '1,234.5' });
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 10,
      numParticipants: 0,
      numInPerson: 0,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    // 1234.5 + 10 = 1244.5
    expect(result.sumDuration).toBe('1,244.5');
  });

  it('falls back to 0 hours when AR sumDuration is missing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, sumDuration: undefined } as any);
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 2.5,
      numParticipants: 0,
      numInPerson: 0,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.sumDuration).toBe('2.5');
  });

  it('strips thousands separators from numParticipants before summing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numParticipants: '1,234' });
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 0,
      numParticipants: 10,
      numInPerson: 0,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    // 1,234 + 10 = 1,244, formatted with thousands separator. If commas were
    // not stripped, parseInt('1,234') would yield 1, so this confirms the
    // formatted string is parsed back to its full value before summing.
    expect(result.numParticipants).toBe('1,244');
  });

  it('falls back to 0 participants when AR numParticipants is missing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, numParticipants: undefined } as any);
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 0,
      numParticipants: 5,
      numInPerson: 0,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.numParticipants).toBe('5');
  });

  it('strips thousands separators from inPerson before summing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, inPerson: '1,234' });
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 0,
      numParticipants: 0,
      numInPerson: 6,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    // 1,234 + 6 = 1,240, formatted with thousands separator. Confirms commas
    // are stripped before parseInt — otherwise parseInt('1,234') => 1.
    expect(result.inPerson).toBe('1,240');
  });

  it('falls back to 0 in-person when AR inPerson is missing', async () => {
    mockOverview.mockResolvedValue({ ...AR_DATA, inPerson: undefined } as any);
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 0,
      numParticipants: 0,
      numInPerson: 3,
    });

    const result = await ttaHistoryOverview(SCOPES, {});

    expect(result.inPerson).toBe('3');
  });

  it('calls both overview and trSessionsForRecipient with the same scopes', async () => {
    mockOverview.mockResolvedValue(AR_DATA);
    mockTrSessionsForRecipient.mockResolvedValue({
      numSessions: '0',
      sumDuration: 0,
      numParticipants: 0,
      numInPerson: 0,
    });

    await ttaHistoryOverview(SCOPES, {});

    expect(mockOverview).toHaveBeenCalledWith(SCOPES);
    expect(mockTrSessionsForRecipient).toHaveBeenCalledWith(SCOPES);
  });
});
