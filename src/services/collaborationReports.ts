// Work in progress; currently stubbed without SQL interactions

// eslint-disable-next-line import/prefer-default-export
export function getCollaborationReports() {
  const stubbedSqlData = [
    {
      id: '1',
      title: 'Collaboration Report 1',
      content: 'Details of collaboration report 1',
      dateStarted: '2024-05-01',
      dateCreated: '2024-05-02',
      status: 'In Progress',
      recipient: 'Region 1 Office',
      creator: 'Jane Doe',
    },
    {
      id: '2',
      title: 'Collaboration Report 2',
      content: 'Details of collaboration report 2',
      dateStarted: '2024-05-10',
      dateCreated: '2024-05-11',
      status: 'Completed',
      recipient: 'Region 2 Office',
      creator: 'John Smith',
    },
    {
      id: '3',
      title: 'Collaboration Report 3',
      content: 'Details of collaboration report 3',
      dateStarted: '2024-05-15',
      dateCreated: '2024-05-16',
      status: 'Draft',
      recipient: 'Region 3 Office',
      creator: 'Alice Johnson',
    },
    {
      id: '4',
      title: 'Collaboration Report 4',
      content: 'Details of collaboration report 4',
      dateStarted: '2024-05-20',
      dateCreated: '2024-05-21',
      status: 'In Review',
      recipient: 'Region 4 Office',
      creator: 'Bob Lee',
    },
    {
      id: '5',
      title: 'Collaboration Report 5',
      content: 'Details of collaboration report 5',
      dateStarted: '2024-05-25',
      dateCreated: '2024-05-26',
      status: 'In Progress',
      recipient: 'Region 5 Office',
      creator: 'Carol White',
    },
    {
      id: '6',
      title: 'Collaboration Report 6',
      content: 'Details of collaboration report 6',
      dateStarted: '2024-05-30',
      dateCreated: '2024-05-31',
      status: 'Completed',
      recipient: 'Region 6 Office',
      creator: 'David Kim',
    },
  ];
  const reports = stubbedSqlData;
  return Promise.resolve({
    count: reports.length,
    rows: reports,
  });
}
