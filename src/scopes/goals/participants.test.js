import {
  Op,
  filtersToScopes,
  Goal,
  sequelize,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
  onlyValidParticipants,
} from './testHelpers';

describe('goals/participants', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters with participants', async () => {
    const filters = { 'participants.in': ['participant1'] };
    const { goal: scope } = await filtersToScopes(filters);
    const found = await Goal.findAll({
      where: {
        [Op.and]: [
          scope,
          {
            id: sharedTestData.possibleGoalIds,
          },
        ],
      },
    });

    expect(found.length).toBeGreaterThan(0);
  });

  it('filters without participants', async () => {
    const filters = { 'participants.nin': ['participant1'] };
    const { goal: scope } = await filtersToScopes(filters);
    const found = await Goal.findAll({
      where: {
        [Op.and]: [
          scope,
          {
            id: sharedTestData.possibleGoalIds,
          },
        ],
      },
    });

    expect(found.length).toBeGreaterThan(0);
  });

  describe('onlyValidParticipants', () => {
    it('returns valid participants when input is an array', () => {
      const query = ['Other', 'invalidParticipant'];
      const result = onlyValidParticipants(query);
      expect(result).toEqual(['Other']);
    });

    it('returns valid participants when input is not an array', () => {
      const query = 'Other';
      const result = onlyValidParticipants(query);
      expect(result).toEqual(['Other']);
    });
  });
});
