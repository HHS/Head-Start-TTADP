import frequencyGraph from './frequencyGraph';
import db from '../models';
import { createReport, destroyReport } from '../testUtils';

describe('frequency graph widget', () => {
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;

  beforeAll(async () => {
    reportOne = await createReport({
      reason: ['Change in Scope'],
      topics: ['Home Visiting'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportTwo = await createReport({
      reason: ['Change in Scope', 'Complaint'],
      topics: ['Five-Year Grant', 'Home Visiting'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportThree = await createReport({
      reason: ['Child Incidents'],
      topics: ['Fiscal / Budget'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportFour = await createReport({
      reason: ['Change in Scope', 'Child Incidents'],
      topics: ['Five-Year Grant', 'Home Visiting', 'Fiscal / Budget'],
      activityRecipients: [{ grantId: 555 }],
    });
  });

  afterAll(async () => {
    await destroyReport(reportOne);
    await destroyReport(reportTwo);
    await destroyReport(reportThree);
    await destroyReport(reportFour);
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns count of topics', async () => {
    const res = await frequencyGraph([{
      id: [reportOne.id, reportTwo.id, reportThree.id, reportFour.id],
    }]);

    const { topic } = res;

    expect(topic.find((r) => r.category === 'Home Visiting').count).toBe(3);
    expect(topic.find((r) => r.category === 'Five-Year Grant').count).toBe(2);
    expect(topic.find((r) => r.category === 'Fiscal / Budget').count).toBe(2);
    expect(topic.find((r) => r.category === 'Nutrition').count).toBe(0);
  });

  it('returns count of reasons', async () => {
    const res = await frequencyGraph([{
      id: [reportOne.id, reportTwo.id, reportThree.id, reportFour.id],
    }]);

    const { reason } = res;

    expect(reason.find((r) => r.category === 'Change in Scope').count).toBe(3);
    expect(reason.find((r) => r.category === 'Complaint').count).toBe(1);
    expect(reason.find((r) => r.category === 'Child Incidents').count).toBe(2);
    expect(reason.find((r) => r.category === 'Full Enrollment').count).toBe(0);
  });
});
