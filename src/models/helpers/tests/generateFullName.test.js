/* eslint-disable import/no-named-default */
import generateFullName from '../generateFullName';

describe('generateFullName', () => {
  it('generates FullName', async () => {
    const name = 'Joe Green';
    expect(generateFullName(name, [{ name: 'TTAC' }])).toEqual('Joe Green, TTAC');
    expect(generateFullName(name, [{ name: 'TTAC' }, { name: 'COR' }])).toEqual('Joe Green, COR, TTAC');
    expect(generateFullName(name, [{ name: 'TTAC' }])).toEqual('Joe Green, TTAC');
    expect(generateFullName(name, [])).toEqual('Joe Green');
    expect(generateFullName(name)).toEqual('Joe Green');
  });
});
