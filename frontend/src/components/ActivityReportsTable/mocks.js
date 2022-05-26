const activityReports = [
  {
    startDate: '02/08/2021',
    lastSaved: '02/05/2021',
    id: 1,
    displayId: 'R14-AR-1',
    regionId: 14,
    topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
    calculatedStatus: 'draft',
    pendingApprovals: '1 of 3',
    approvers: [{ User: { fullName: 'Approver Manager 1' } }, { User: { fullName: 'Approver Manager 2' } }, { User: { fullName: 'Approver Manager 3' } }],
    activityRecipients: [
      {
        activityRecipientId: 5,
        name: 'Johnston-Romaguera - 14CH00003',
        id: 1,
        grant: {
          id: 5,
          number: '14CH00003',
          recipient: {
            name: 'Johnston-Romaguera',
          },
        },
        otherEntity: null,
      },
      {
        activityRecipientId: 4,
        name: 'Johnston-Romaguera - 14CH00002',
        id: 2,
        grant: {
          id: 4,
          number: '14CH00002',
          recipient: {
            name: 'Johnston-Romaguera',
          },
        },
        otherEntity: null,
      },
      {
        activityRecipientId: 1,
        name: 'Recipient Name - 14CH1234',
        id: 3,
        grant: {
          id: 1,
          number: '14CH1234',
          recipient: {
            name: 'Recipient Name',
          },
        },
        otherEntity: null,
      },
    ],
    author: {
      fullName: 'Kiwi, GS',
      name: 'Kiwi',
      role: 'Grants Specialist',
      homeRegionId: 14,
    },
    activityReportCollaborators: [
      {
        fullName: 'Orange, GS',
        fullNameSubstituteRoles: 'Orange, GS',
        user: {
          fullName: 'Orange, GS',
          name: 'Orange',
          role: 'Grants Specialist',
        },
      },
      {
        fullName: 'Hermione Granger, SS',
        fullNameSubstituteRoles: 'Hermione Granger, SS',
        user: {
          fullName: 'Hermione Granger, SS',
          name: 'Hermione Granger',
          role: 'System Specialist',
        },
      },
    ],
  },
  {
    startDate: '02/01/2021',
    lastSaved: '02/04/2021',
    id: 2,
    displayId: 'R14-AR-2',
    regionId: 14,
    topics: [],
    pendingApprovals: '2 of 2',
    approvers: [{ User: { fullName: 'Approver Manager 4' } }, { User: { fullName: 'Approver Manager 5' } }],
    calculatedStatus: 'needs_action',
    activityRecipients: [
      {
        activityRecipientId: 3,
        name: 'QRIS System',
        id: 31,
        grant: null,
        otherEntity: {
          id: 3,
          name: 'QRIS System',
          createdAt: '2021-02-03T21:00:57.149Z',
          updatedAt: '2021-02-03T21:00:57.149Z',
        },
      },
    ],
    author: {
      fullName: 'Kiwi, GS',
      name: 'Kiwi',
      role: 'Grants Specialist',
      homeRegionId: 14,
    },
    activityReportCollaborators: [
      {
        fullName: 'Cucumber User, GS',
        fullNameSubstituteRoles: 'Cucumber User, GS',
        user: {
          fullName: 'Cucumber User, GS',
          name: 'Cucumber User',
          role: 'Recipient Specialist',
        },
      },
      {
        fullName: 'Hermione Granger, SS',
        fullNameSubstituteRoles: 'Hermione Granger, SS',
        user: {
          fullName: 'Hermione Granger, SS',
          name: 'Hermione Granger',
          role: 'System Specialist',
        },
      },
    ],
  },
];

export const activityReportsSorted = [
  {
    startDate: '02/01/2021',
    lastSaved: '02/04/2021',
    id: 2,
    displayId: 'R14-AR-2',
    regionId: 14,
    topics: [],
    calculatedStatus: 'needs_action',
    creatorName: 'Kiwi, GS',
    activityRecipients: [
      {
        activityRecipientId: 3,
        name: 'QRIS System',
        id: 31,
        grant: null,
        otherEntity: {
          id: 3,
          name: 'QRIS System',
          createdAt: '2021-02-03T21:00:57.149Z',
          updatedAt: '2021-02-03T21:00:57.149Z',
        },
      },
    ],
    author: {
      fullName: 'Kiwi, GS',
      name: 'Kiwi',
      role: 'Grants Specialist',
      homeRegionId: 14,
    },
    activityReportCollaborators: [
      {
        fullName: 'Cucumber User, GS',
        fullNameSubstituteRoles: 'Cucumber User, GS',
        user: {
          fullName: 'Cucumber User, GS',
          name: 'Cucumber User',
          role: 'Recipient Specialist',
        },
      },
      {
        fullName: 'Hermione Granger, SS',
        fullNameSubstituteRoles: 'Hermione Granger, SS',
        user: {
          fullName: 'Hermione Granger, SS',
          name: 'Hermione Granger',
          role: 'System Specialist',
        },
      },
    ],
  },
  {
    startDate: '02/08/2021',
    lastSaved: '02/05/2021',
    id: 1,
    displayId: 'R14-AR-1',
    regionId: 14,
    topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
    calculatedStatus: 'draft',
    creatorName: 'Kiwi, TTAC',
    activityRecipients: [
      {
        activityRecipientId: 5,
        name: 'Johnston-Romaguera - 14CH00003',
        id: 1,
        grant: {
          id: 5,
          number: '14CH00003',
          recipient: {
            name: 'Johnston-Romaguera',
          },
        },
        otherEntity: null,
      },
      {
        activityRecipientId: 4,
        name: 'Johnston-Romaguera - 14CH00002',
        id: 2,
        grant: {
          id: 4,
          number: '14CH00002',
          recipient: {
            name: 'Johnston-Romaguera',
          },
        },
        otherEntity: null,
      },
      {
        activityRecipientId: 1,
        name: 'Recipient Name - 14CH1234',
        id: 3,
        grant: {
          id: 1,
          number: '14CH1234',
          recipient: {
            name: 'Recipient Name',
          },
        },
        otherEntity: null,
      },
    ],
    author: {
      fullName: 'Kiwi, TTAC',
      name: 'Kiwi',
      role: 'Grants Specialist',
      homeRegionId: 14,
    },
    activityReportCollaborators: [
      {
        fullName: 'Orange, GS',
        fullNameSubstituteRoles: 'Orange, GS',
        user: {
          fullName: 'Orange, GS',
          name: 'Orange',
          role: 'Grants Specialist',
        },
      },
      {
        fullName: 'Hermione Granger, SS',
        fullNameSubstituteRoles: 'Hermione Granger, SS',
        user: {
          fullName: 'Hermione Granger, SS',
          name: 'Hermione Granger',
          role: 'System Specialist',
        },
      },
    ],
  },
];

export const generateXFakeReports = (count, status = []) => {
  const result = [];
  for (let i = 1; i <= count; i += 1) {
    result.push(
      {
        startDate: '02/08/2021',
        lastSaved: '02/05/2021',
        id: i,
        displayId: 'R14-AR-1',
        regionId: 14,
        topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
        calculatedStatus: status[i] || 'draft',
        activityRecipients: [
          {
            activityRecipientId: 5,
            name: 'Johnston-Romaguera - 14CH00003',
            id: 1,
            grant: {
              id: 5,
              number: '14CH00003',
              recipient: {
                name: 'Johnston-Romaguera',
              },
            },
            otherEntity: null,
          },
          {
            activityRecipientId: 4,
            name: 'Johnston-Romaguera - 14CH00002',
            id: 2,
            grant: {
              id: 4,
              number: '14CH00002',
              recipient: {
                name: 'Johnston-Romaguera',
              },
            },
            otherEntity: null,
          },
          {
            activityRecipientId: 1,
            name: 'Grantee Name - 14CH1234',
            id: 3,
            grant: {
              id: 1,
              number: '14CH1234',
              recipient: {
                name: 'Grantee Name',
              },
            },
            otherEntity: null,
          },
        ],
        author: {
          fullName: 'Kiwi, GS',
          name: 'Kiwi',
          role: 'Grants Specialist',
          homeRegionId: 14,
        },
        activityReportCollaborators: [
          {
            fullName: 'Orange, GS',
            fullNameSubstituteRoles: 'Orange, GS',
            user: {
              fullName: 'Orange, GS',
              name: 'Orange',
              role: 'Grants Specialist',
            },
          },
          {
            fullName: 'Hermione Granger, SS',
            fullNameSubstituteRoles: 'Hermione Granger, SS',
            user: {
              fullName: 'Hermione Granger, SS',
              name: 'Hermione Granger',
              role: 'System Specialist',
            },
          },
        ],
      },
    );
  }
  return result;
};

export const overviewRegionOne = {
  numReports: '1',
  numGrants: '2',
  numOtherEntities: '2',
  numTotalGrants: '4',
  numParticipants: '3',
  sumDuration: '0.5',
};

export default activityReports;
