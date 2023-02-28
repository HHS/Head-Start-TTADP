/* eslint-disable import/prefer-default-export */
// import { getResourcesData } from '../../services/resources';

const dummyOverview = {
  report: {
    numResources: '8,135',
    num: '19,914',
    percentResources: '40.85%',
  },
  resource: {
    numEclkc: '1,819',
    num: '2,365',
    percentEclkc: '79.91%',
  },
  recipient: {
    numResources: '248',
  },
  participant: {
    numParticipants: '765',
  },
};

const dummyUse = {
  headers: ['Jan-22'],
  resources: [
    {
      heading: 'https://test1.gov',
      isUrl: true,
      data: [
        {
          title: 'Jan-22',
          value: '17',
        },
        {
          title: 'total',
          value: '20',
        },
      ],
    },
  ],
};

export async function getResourcesDashboardData(req, res) {
  // Garrett call your service function here.
  // Build scopes from the req (see AR handler)
  // getResourcesData()
  const roles = {
    resourcesDashboardOverview: dummyOverview,
    resourcesUse: dummyUse,
  };
  res.json(roles);
}
