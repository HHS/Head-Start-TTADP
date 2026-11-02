import { Op } from 'sequelize';
import db from '../models';
import { getRecipientTimeline, getTimelineGoalCategories } from './recipientTimeline';

const { Goal, GoalStatusChange, sequelize } = db;

jest.mock('../models', () => ({
  Goal: { findAll: jest.fn() },
  GoalStatusChange: { unscoped: jest.fn() },
  GoalTemplate: {},
  Grant: { unscoped: () => ({}) },
  sequelize: { query: jest.fn() },
}));
jest.mock('../logger', () => ({ auditLogger: { error: jest.fn() } }));

const params = {
  recipientId: 401,
  regionId: 1,
  limit: 25,
  offset: 0,
  sortBy: 'date' as const,
  direction: 'desc' as const,
  filters: [],
  excludeMultiRecipientCommunications: false,
};
const goal = (standard: string, status = 'In Progress') => ({ status, goalTemplate: { standard } });

beforeEach(() => {
  jest.clearAllMocks();
  (Goal.findAll as jest.Mock).mockResolvedValue([]);
  (GoalStatusChange.unscoped as jest.Mock).mockReturnValue({
    findAll: jest.fn().mockResolvedValue([]),
  });
  (sequelize.query as jest.Mock).mockResolvedValue([
    { count: 0, source: null, sourceId: null, date: null, eventType: null },
  ]);
});

describe('timeline views', () => {
  it.each(['monitoring', 'goals'] as const)(
    'shows only the latest status in %s, independent of goal edits and event pagination',
    async (view) => {
      (Goal.findAll as jest.Mock).mockResolvedValue([
        {
          ...goal('Monitoring', 'Closed'),
          id: 2,
          createdAt: '2026-01-01',
          updatedAt: '2026-10-26',
        },
        { ...goal('Monitoring'), id: 1, createdAt: '2025-01-01', updatedAt: '2026-06-01' },
      ]);
      const findAll = jest.fn().mockResolvedValue([
        { goalId: 2, lastStatusChangedAt: '2026-02-01' },
        { goalId: 1, lastStatusChangedAt: '2026-06-01' },
      ]);
      (GoalStatusChange.unscoped as jest.Mock).mockReturnValue({ findAll });
      const result = await getRecipientTimeline({ ...params, view, offset: 25 });
      expect(result.categories).toEqual([{ label: 'Monitoring', statuses: ['In Progress'] }]);
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ goalId: { [Op.in]: [2, 1] } }),
          group: ['goalId'],
        })
      );
    }
  );

  it('uses creation dates without history and breaks timestamp ties by goal ID', async () => {
    const goals = [
      { ...goal('Monitoring', 'Closed'), id: 1, createdAt: '2026-01-01' },
      { ...goal('Monitoring', 'In Progress'), id: 3, createdAt: '2026-06-01' },
      { ...goal('Monitoring', 'Suspended'), id: 2, createdAt: '2026-06-01' },
    ];
    for (const rows of [goals, [...goals].reverse()]) {
      (Goal.findAll as jest.Mock).mockResolvedValue(rows);
      expect(await getTimelineGoalCategories(401, 1)).toEqual([
        { label: 'Monitoring', statuses: ['In Progress'] },
      ]);
    }
  });

  it('keeps a category without a badge when its latest goal has no status', async () => {
    (Goal.findAll as jest.Mock).mockResolvedValue([
      { ...goal('Monitoring', 'Closed'), id: 1, createdAt: '2026-01-01' },
      { ...goal('Monitoring'), status: null, id: 2, createdAt: '2026-06-01' },
    ]);
    expect(await getTimelineGoalCategories(401, 1)).toEqual([
      { label: 'Monitoring', statuses: [] },
    ]);
  });

  it('scopes category lookup to recipient/region and non-draft unmerged RTTAPA goals', async () => {
    (Goal.findAll as jest.Mock).mockResolvedValue([
      goal('Monitoring'),
      goal('Family Support', 'Closed'),
      goal('Monitoring', 'Closed'),
      goal('Monitoring'),
      goal('  '),
      { status: 'Closed', goalTemplate: null },
    ]);
    expect(await getTimelineGoalCategories(401, 1)).toEqual([
      { label: 'Family Support', statuses: ['Closed'] },
      { label: 'Monitoring', statuses: ['In Progress'] },
    ]);
    expect(Goal.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          mapsToParentGoalId: null,
          [Op.and]: [
            { [Op.or]: [{ status: null }, { status: { [Op.ne]: 'Draft' } }] },
            { [Op.or]: [{ isRttapa: 'Yes' }, { '$goalTemplate.creationMethod$': 'Curated' }] },
          ],
        },
        include: expect.arrayContaining([
          expect.objectContaining({
            as: 'grant',
            required: true,
            where: { recipientId: 401, regionId: 1 },
          }),
        ]),
      })
    );
  });

  it('keeps the default view backwards compatible without a category query', async () => {
    expect(await getRecipientTimeline(params)).toEqual({ count: 0, events: [] });
    expect(Goal.findAll).not.toHaveBeenCalled();
  });

  it('returns an empty goal view without querying the event index when no categories qualify', async () => {
    expect(await getRecipientTimeline({ ...params, view: 'goals' })).toEqual({
      count: 0,
      events: [],
      categories: [],
    });
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it.each(['monitoring', 'goals'] as const)(
    'applies %s constraints before count and pagination',
    async (view) => {
      (Goal.findAll as jest.Mock).mockResolvedValue([goal('Monitoring'), goal('Family Support')]);
      const result = await getRecipientTimeline({ ...params, view, offset: 25 });
      expect(result.categories.map(({ label }) => label)).toEqual(
        view === 'monitoring' ? ['Monitoring'] : ['Family Support', 'Monitoring']
      );
      const [sql, options] = (sequelize.query as jest.Mock).mock.calls[0];
      expect(sql.indexOf('"standard" IN')).toBeLessThan(sql.indexOf('LIMIT :timelineLimit'));
      expect(Object.values(options.replacements)).toContainEqual(
        view === 'monitoring' ? ['Monitoring'] : ['Family Support', 'Monitoring']
      );
      expect(options.replacements.timelineOffset).toBe(25);
      // Communication access is still checked before the source index is constructed.
      expect(sql).not.toContain('FROM "CommunicationLogs"');
    }
  );

  it('rejects an invalid view before category or event queries', async () => {
    await expect(
      getRecipientTimeline({ ...params, view: 'invalid' as 'goals' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(Goal.findAll).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
