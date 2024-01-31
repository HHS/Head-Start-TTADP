type MonitoringDataArgs = {
  recipientId: number;
  grantNumber: string;
  regionId: number;
};

export async function monitoringData({ recipientId, grantNumber, regionId }: MonitoringDataArgs) {
  return {
    recipientId,
    regionId,
    grantNumber,
    reviewStatus: 'Compliant',
    reviewDate: '05/01/2023',
    reviewType: 'FA-2',
  };
}

export async function classScore({ recipientId, grantNumber, regionId }: MonitoringDataArgs) {
  return {
    recipientId,
    regionId,
    grantNumber,
    received: '05/01/2023',
    ES: 6,
    CO: 3,
    IS: 7,
  };
}
