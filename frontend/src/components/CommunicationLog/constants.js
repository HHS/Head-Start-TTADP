import { NOT_STARTED } from '../Navigator/constants';

const nextStepsFields = {
  specialistNextSteps: [{ note: '', completeDate: '' }],
  recipientNextSteps: [{ note: '', completeDate: '' }],
  pocComplete: false,
};

const defaultLogValues = {
  communicationDate: '',
  duration: '',
  method: '',
  purpose: '',
};

const defaultAttachmentValues = {
  files: [],
};

const defaultValues = {
  ...defaultLogValues,
  ...defaultAttachmentValues,
  ...nextStepsFields,
  id: 0,
  recipientId: '',
  userId: '',
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
  },
};

const recipientRecordRootUrl = (
  recipientId,
  regionId,
) => `/recipient-tta-records/${recipientId}/region/${regionId}`;

const formatRecipientCommunicationLogUrl = (
  recipientId,
  regionId,
  communicationLogId,
  currentPage = '',
) => `${recipientRecordRootUrl(recipientId, regionId)}/communication/${communicationLogId}/${currentPage}`;

const formatRegionalCommunicationLogUrl = (
  regionId,
  communicationLogId,
  currentPage = '',
) => `/communication-log/region/${regionId}/log/${communicationLogId}/${currentPage}`;

const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => hookForm.getValues(field));

export {
  defaultValues,
  defaultLogValues,
  recipientRecordRootUrl,
  formatRecipientCommunicationLogUrl,
  formatRegionalCommunicationLogUrl,
  pageComplete,
  nextStepsFields,
};
