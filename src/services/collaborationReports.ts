// TODO: Work in progress; currently stubbed without SQL interactions, to return an empty array.

// eslint-disable-next-line import/prefer-default-export
export function getCollaborationReports() {
  const stubbedSqlData = [];
  const reports = stubbedSqlData;
  return Promise.resolve({
    count: reports.length,
    rows: reports,
  });
}
