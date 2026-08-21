import express from 'express';
import request from 'supertest';
import db from '../../models';
import { getUserReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import { createReport, destroyReport, getUniqueId } from '../../testUtils';
import router from './index';

// Mock only the auth boundary and the New Relic middleware. The route, handler,
// export service, SQL, and DB all run for real - this is an end-to-end thread
// test through the HTTP layer.
jest.mock('../../services/currentUser', () => ({ currentUserId: jest.fn() }));
jest.mock('../../services/accessValidation');
jest.mock('../../middleware/newRelicMiddleware', () => ({
  nameTransactionByBase: (req, res, next) => next(),
  nameTransactionByPath: (req, res, next) => next(),
}));

const REGION_ID = 20;
const USER_ID = 314;
const EXPORT_URL = '/api/activity-reports/export';

const app = express();
app.use(express.json());
app.use('/api/activity-reports', router);

describe('POST /api/activity-reports/export', () => {
  let report;

  beforeAll(async () => {
    report = await createReport({
      regionId: REGION_ID,
      activityRecipients: [{ grantId: getUniqueId() }],
    });
  });

  afterAll(async () => {
    await destroyReport(report);
    await db.sequelize.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUserId.mockResolvedValue(USER_ID);
    getUserReadRegions.mockResolvedValue([REGION_ID]);
  });

  it('streams a CSV export for the in-scope report', async () => {
    const res = await request(app)
      .post(EXPORT_URL)
      .send({ dataSet: 'activity-reports', reportIds: [report.id] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toContain('activity_report_export.csv');
    expect(res.text.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    expect(res.text).toContain('report_id'); // header row
    expect(res.text).toContain(`R${REGION_ID}-AR-${report.id}`);
    expect(currentUserId).toHaveBeenCalled();
    expect(getUserReadRegions).toHaveBeenCalledWith(USER_ID);
  });

  it('enforces region policy from the SQL, not the supplied ids', async () => {
    // Ids include the report, but the user's regions do not - it must be excluded.
    getUserReadRegions.mockResolvedValue([1]);

    const res = await request(app)
      .post(EXPORT_URL)
      .send({ dataSet: 'activity-reports', reportIds: [report.id] });

    expect(res.status).toBe(200);
    expect(res.text).not.toContain(`R${REGION_ID}-AR-${report.id}`);
  });

  it('returns 400 for an unknown dataSet', async () => {
    const res = await request(app)
      .post(EXPORT_URL)
      .send({ dataSet: 'bogus', reportIds: [report.id] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid dataSet/);
  });

  it('returns 400 for an unsupported sort column', async () => {
    const res = await request(app)
      .post(EXPORT_URL)
      .send({ dataSet: 'goals', reportIds: [report.id], sortBy: 'not_a_column' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unsupported sort column/);
  });

  it('returns 400 when reportIds is missing', async () => {
    const res = await request(app).post(EXPORT_URL).send({ dataSet: 'activity-reports' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reportIds is required/);
  });
});
