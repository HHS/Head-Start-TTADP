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
    recipients: [{
      name: 'recipient 1',
      grants: [
        {
          id: 1,
          number: 1,
        },
      ],
      recipients: [
        {
          id: 1,
          name: 'recipient',
        },
      ],
    }],
  };
}
