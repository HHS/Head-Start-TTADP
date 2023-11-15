import { NOT_STARTED } from '../../../../components/Navigator/constants';

const methodOptions = [
  'Email',
  'Phone',
  'In person',
  'Virtual',
];

const purposeOptions = [
  'CLASS',
  'FEI',
  'Monitoring',
  'New TTA request',
  'Program Specialist or Regional Office meeting',
  'Program Specialist\'s Monthly contact',
  'Program Specialist\'s site visit',
  'Recipient question/feedback',
  'RTTAPA updates',
  'RTTAPA Initial Plan / New Recipient',
  'TTA planning or scheduling',
];

const resultOptions = [
  'New TTA accepted',
  'New TTA declined',
  'RTTAPA declined',
  'Next Steps identified',
];

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
  result: '',
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

const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => hookForm.getValues(field));

export {
  defaultValues,
  defaultLogValues,
  recipientRecordRootUrl,
  formatCommunicationLogUrl,
  methodOptions,
  purposeOptions,
  resultOptions,
  pageComplete,
  nextStepsFields,
};
