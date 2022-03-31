import db, { ActivityReport } from '../models';
import { createReport, destroyReport } from '../testUtils';
import updateArDate from './updateArDate';

describe('updateArDate', () => {
  let ar;
  const LEGACY_ID = 'THIS-IS-LEGACY-ID';

  beforeAll(async () => {
    ar = await createReport({
      legacyId: LEGACY_ID,
      activityRecipients: [],
      imported: {
        startDate: '12/21/21',
        endDate: '12/21/21',
      },
    });
  });

  afterAll(async () => {
    await destroyReport(ar);
    await db.sequelize.close();
  });

  it('updates report date', async () => {
    await updateArDate(LEGACY_ID);

    const found = await ActivityReport.findByPk(ar.id);
    expect(found).toBeTruthy();

    const { imported: { startDate, endDate } } = found;

    expect(startDate).toBe('12/21/20');
    expect(endDate).toBe('12/21/20');
    expect(found.startDate).toBe('12/21/2020');
    expect(found.endDate).toBe('12/21/2020');
  });
});
