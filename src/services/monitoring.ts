export async function monitoringData(recipientId: number, regionId: number) {
  return {
    recipientId,
    regionId,
    reviewStatus: 'Compliant',
    reviewDate: '05/01/2023',
    reviewType: 'FA-2',
  };
}

export async function classScore(recipientId: number, regionId: number) {
  return {
    recipientId,
    regionId,
    received: '05/01/2023',
    ES: 6,
    CO: 3,
    IS: 7,
  };
}
