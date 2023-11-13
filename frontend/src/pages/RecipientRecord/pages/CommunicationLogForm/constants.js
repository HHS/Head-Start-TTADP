import { NOT_STARTED } from '../../../../components/Navigator/constants';

const defaultLogValues = {
  communicationDate: '',
  duration: '',
  method: '',
  purpose: '',
  notes: '',
  result: '',
};

const defaultValues = {
  ...defaultLogValues,
  id: 0,
  recipientId: '',
  userId: '',
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
    4: NOT_STARTED,
  },
};

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
