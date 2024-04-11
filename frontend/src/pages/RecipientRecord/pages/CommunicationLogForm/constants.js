import { NOT_STARTED } from '../../../../components/Navigator/constants';

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

const formatCommunicationLogUrl = (
  recipientId,
  regionId,
  communicationLogId,
  currentPage = '',
) => `${recipientRecordRootUrl(recipientId, regionId)}/communication/${communicationLogId}/${currentPage}`;

const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => hookForm.getValues(field));

export {
  defaultValues,
  defaultLogValues,
  recipientRecordRootUrl,
  formatCommunicationLogUrl,
  pageComplete,
  nextStepsFields,
};
