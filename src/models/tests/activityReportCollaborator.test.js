/* eslint-disable import/no-named-default */
import { default as generateFullNameCollaborator } from '../hooks/activityReportCollaborator';
import { default as generateFullNameUser } from '../hooks/user';

const mockUser = {
  name: 'Joe Green',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65535',
  hsesUsername: 'test49@test49.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test49@test49.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      regionId: 1,
      scopeId: 1,
    },
    {
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};
mockUser.fullName = generateFullNameUser(mockUser.name, mockUser.role);

describe('Activity Report Collaborator', () => {
  it('generateFullName', async () => {
    expect(generateFullNameCollaborator(mockUser, [{ role: 'TTAC' }])).toEqual('Joe Green, TTAC');
    expect(generateFullNameCollaborator(mockUser, [{ role: 'TTAC' }, { role: 'COR' }])).toEqual('Joe Green, COR, TTAC');
    expect(generateFullNameCollaborator(mockUser, [{ role: 'Grantee Specialist' }, { role: 'Health Specialist' }])).toEqual('Joe Green, GS, HS');
    expect(generateFullNameCollaborator(mockUser, [])).toEqual('Joe Green, TTAC');
    expect(generateFullNameCollaborator(mockUser, null)).toEqual('Joe Green, TTAC');
  });
});
