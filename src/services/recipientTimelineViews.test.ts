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
const hasEvents = (value: boolean) => [{ hasEvents: value }];
const indexCount = (count: number) => [
  { count, source: null, sourceId: null, date: null, cursorOccurredAt: null, eventType: null },
];

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
      (sequelize.query as jest.Mock).mockResolvedValue(indexCount(5));
      const result = await getRecipientTimeline({ ...params, view });
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

  it('scopes category lookup to recipient/region and non-draft unmerged RTTAPA goals from approved reports', async () => {
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
            {
              [Op.or]: [
                { createdVia: null },
                { createdVia: { [Op.ne]: 'activityReport' } },
                { onApprovedAR: true },
              ],
            },
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
      (sequelize.query as jest.Mock).mockResolvedValue(indexCount(5));
      const result = await getRecipientTimeline({ ...params, view, offset: 25 });
      // Later pages name only the categories of their own events; this page has none.
      expect(result.categories).toEqual([]);
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

  describe('categories with events', () => {
    beforeEach(() => {
      (Goal.findAll as jest.Mock).mockResolvedValue([
        goal('Monitoring'),
        goal('Family Support'),
        goal('Governance'),
      ]);
    });

    it('lists only categories with events under the filters, regardless of the page contents', async () => {
      const filters = [
        { topic: 'date' as const, condition: 'is on or after' as const, query: '01/01/2026' },
      ];
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce(indexCount(7))
        .mockResolvedValueOnce(hasEvents(false))
        .mockResolvedValueOnce(hasEvents(true))
        .mockResolvedValueOnce(hasEvents(true));
      const result = await getRecipientTimeline({ ...params, view: 'goals', filters });
      expect(result.categories.map(({ label }) => label)).toEqual(['Governance', 'Monitoring']);

      const calls = (sequelize.query as jest.Mock).mock.calls;
      expect(calls).toHaveLength(4);
      const [, categoryOptions] = calls[1];
      // Each check is limited to one category and keeps the user's filters.
      expect(Object.values(categoryOptions.replacements)).toContainEqual(['Family Support']);
      expect(Object.values(categoryOptions.replacements)).toContain('2026-01-01');
      // It only asks whether an event exists: no total count, ordering, or paging.
      const categorySql = calls[1][0];
      expect(categorySql).toContain('SELECT EXISTS (SELECT 1 FROM "filteredTimelineEvents")');
      expect(categorySql).not.toMatch(/COUNT\(\*\)|LIMIT|OFFSET|ORDER BY "occurredAt"/);
    });

    it('returns no categories without any query for them when no events match', async () => {
      const result = await getRecipientTimeline({ ...params, view: 'goals' });
      expect(result).toEqual({ count: 0, events: [], categories: [] });
      expect(sequelize.query).toHaveBeenCalledTimes(1);
    });

    it('skips the per-category checks when the view has a single category', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue(indexCount(2));
      const result = await getRecipientTimeline({ ...params, view: 'monitoring' });
      expect(result.categories).toEqual([{ label: 'Monitoring', statuses: ['In Progress'] }]);
      expect(sequelize.query).toHaveBeenCalledTimes(1);
    });

    it('names only the categories of the page on later pages, without further queries', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue(indexCount(7));
      const first = await getRecipientTimeline({ ...params, view: 'goals', limit: 2 });
      expect(first.categories).toBeDefined();
      (sequelize.query as jest.Mock).mockClear();
      (Goal.findAll as jest.Mock).mockClear();
      const cursor = Buffer.from(
        JSON.stringify(['2026-08-22 10:00:00', 'communicationLog', 5])
      ).toString('base64url');
      const later = await getRecipientTimeline({ ...params, view: 'goals', limit: 2, cursor });
      // This page has no events, so it names no category. Tag matching is covered with real
      // events in the goal status change tests.
      expect(later.categories).toEqual([]);
      // One event query, and no per-category existence checks.
      expect(sequelize.query).toHaveBeenCalledTimes(1);
      // The eligible categories are looked up once per request, as on the first page.
      expect(Goal.findAll).toHaveBeenCalledTimes(1);
    });
  });

  it('rejects an invalid view before category or event queries', async () => {
    await expect(
      getRecipientTimeline({ ...params, view: 'invalid' as 'goals' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(Goal.findAll).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
