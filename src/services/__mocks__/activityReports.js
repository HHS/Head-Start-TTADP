export function activityReportById(activityReportId) {
  return {
    id: activityReportId,
    resourcesUsed: 'resources',
  };
}

export async function createOrUpdate(newActivityReport, report) {
  if (report) {
    return { ...report, ...newActivityReport };
  }
  return { ...newActivityReport };
}

export async function possibleRecipients() {
  return {
    grantees: [{
      name: 'grantee 1',
      grants: [
        {
          id: 1,
          number: 1,
        },
      ],
      grantees: [
        {
          id: 1,
          name: 'grantee',
        },
      ],
    }],
  };
}
