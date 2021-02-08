const activityReports = [
  {
    startDate: '02/08/2021',
    lastSaved: '02/04/2021',
    id: 1,
    regionId: 14,
    topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
    status: 'draft',
    activityRecipients: [
      {
        activityRecipientId: 5,
        name: 'Johnston-Romaguera - 14CH00003',
        id: 1,
        grant: {
          id: 5,
          number: '14CH00003',
          grantee: {
            name: 'Johnston-Romaguera',
          },
        },
        nonGrantee: null,
      },
      {
        activityRecipientId: 4,
        name: 'Johnston-Romaguera - 14CH00002',
        id: 2,
        grant: {
          id: 4,
          number: '14CH00002',
          grantee: {
            name: 'Johnston-Romaguera',
          },
        },
        nonGrantee: null,
      },
      {
        activityRecipientId: 1,
        name: 'Grantee Name - 14CH1234',
        id: 3,
        grant: {
          id: 1,
          number: '14CH1234',
          grantee: {
            name: 'Grantee Name',
          },
        },
        nonGrantee: null,
      },
    ],
    author: {
      fullName: 'Kiwi, Grants Specialist',
      name: 'Kiwi',
      role: 'Grants Specialist',
      homeRegionId: 3,
    },
    collaborators: [
      {
        name: 'Orange',
      },
      {
        name: 'Hermione Granger',
      },
    ],
  },
  {
    startDate: '02/01/2021',
    lastSaved: '02/04/2021',
    id: 2,
    regionId: 14,
    topics: [],
    status: 'draft',
    activityRecipients: [
      {
        activityRecipientId: 3,
        name: 'QRIS System',
        id: 31,
        grant: null,
        nonGrantee: {
          id: 3,
          name: 'QRIS System',
          createdAt: '2021-02-03T21:00:57.149Z',
          updatedAt: '2021-02-03T21:00:57.149Z',
        },
      },
    ],
    author: {
      fullName: 'Kiwi, Grants Specialist',
      name: 'Kiwi',
      role: 'Grants Specialist',
      homeRegionId: 3,
    },
    collaborators: [
      {
        name: 'Cucumber User',
      },
      {
        name: 'Hermione Granger',
      },
    ],
  },
];
export default activityReports;
