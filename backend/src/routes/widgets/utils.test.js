import { formatQuery, onlyAllowedKeys } from './utils';

describe('format query helper function', () => {
  it('returns an object with region', () => {
    const query = { 'region.in': ['18'] };
    expect(formatQuery(query)).toEqual({ ...query, region: 18 });
  });
});

describe('allowedKeys helper function', () => {
  it('removes disallowed keys', () => {
    const query = { badKey: 'does bad things', 'startDate.win': '2020/06/25' };
    expect(onlyAllowedKeys(query)).toEqual({ 'startDate.win': '2020/06/25' });
  });
});
