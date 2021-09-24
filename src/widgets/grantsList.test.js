import db, { User, Grantee, Grant } from '../models';
import { determineFiltersToScopes } from '../scopes';
import grantsList from './grantsList';

const GRANTEE_ID = 102370;
const GRANT_ID_ONE = 881037;
const GRANT_ID_TWO = 999812;
const GRANT_ID_THREE = 999825;

const mockUser = {
  id: 22938400,
  homeRegionId: 1,
  name: 'user22938400',
  hsesUsername: 'user22938400',
  hsesUserId: '22938400',
};

describe('Grant list widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Grantee.create({ name: 'grantee', id: GRANTEE_ID });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE, number: GRANT_ID_ONE, granteeId: GRANTEE_ID, regionId: 8, status: 'Active', startDate: '01/15/2021', endDate: '01/20/2021',
    }, {
      id: GRANT_ID_TWO, number: GRANT_ID_TWO, granteeId: GRANTEE_ID, regionId: 8, status: 'Inactive', startDate: '02/01/2021', endDate: '02/10/2021',
    },
    {
      id: GRANT_ID_THREE, number: GRANT_ID_THREE, granteeId: GRANTEE_ID, regionId: 7, status: 'Inactive', startDate: '03/05/2021', endDate: '03/15/2021',
    }]);
  });
  afterAll(async () => {
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: [GRANT_ID_ONE, GRANT_ID_TWO, GRANT_ID_THREE] } });
    await Grantee.destroy({ where: { id: GRANTEE_ID } });
    await db.sequelize.close();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('retrieves grants list for specified grantee', async () => {
    const query = { 'region.in': ['8'], 'grantee.in': [GRANTEE_ID], 'startDate.win': '2021/01/01-2021/02/28' };
    const scopes = determineFiltersToScopes('grantee', query);
    const res = await grantsList(scopes, query);

    expect(res.length).toBe(2);
    expect(res[0].id).toBe(GRANT_ID_ONE);
    expect(res[0].status).toBe('Active');
    expect(res[0].regionId).toBe(8);

    expect(res[1].id).toBe(GRANT_ID_TWO);
    expect(res[1].status).toBe('Inactive');
    expect(res[1].regionId).toBe(8);
  });
  it('does not retrieve grants list when outside of range and region', async () => {
    const query = { 'region.in': ['8'], 'grantee.in': [GRANTEE_ID], 'startDate.win': '2021/03/01-2021/03/31' };
    const scopes = determineFiltersToScopes('grantee', query);
    const res = await grantsList(scopes, query);
    expect(res.length).toBe(0);
  });
});
