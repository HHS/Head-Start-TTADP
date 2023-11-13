/* eslint-disable import/prefer-default-export */
const defaultValues = {};

const recipientRecordRootUrl = (
  recipientId,
  regionId,
) => `/recipient-tta-records/${recipientId}/region/${regionId}`;

const formatCommunicationLogUrl = (
  recipientId,
  regionId,
  communicationLogId,
  currentPage = '',
) => `${recipientRecordRootUrl(recipientId, regionId)}/communication/${communicationLogId}/${currentPage}`;

export {
  defaultValues,
  recipientRecordRootUrl,
  formatCommunicationLogUrl,
};
