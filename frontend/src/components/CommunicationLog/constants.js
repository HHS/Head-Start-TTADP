import { NOT_STARTED } from '../Navigator/constants'

const nextStepsFields = {
  specialistNextSteps: [{ note: '', completeDate: '' }],
  recipientNextSteps: [{ note: '', completeDate: '' }],
  pocComplete: false,
}

const defaultLogValues = {
  communicationDate: '',
  duration: '',
  method: '',
  purpose: '',
}

const defaultAttachmentValues = {
  files: [],
}

const defaultValues = {
  ...defaultLogValues,
  ...defaultAttachmentValues,
  ...nextStepsFields,
  id: 0,
  recipientId: '',
  userId: '',
  recipients: [],
  goals: [],
  otherStaff: [],
  author: { name: '' },
  notes: '',
  result: '',
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
  },
}

const recipientRecordRootUrl = (recipientId, regionId) => `/recipient-tta-records/${recipientId}/region/${regionId}`

const formatRecipientCommunicationLogUrl = (recipientId, regionId, communicationLogId, currentPage = '') =>
  `${recipientRecordRootUrl(recipientId, regionId)}/communication/${communicationLogId}/${currentPage}`

const formatRegionalCommunicationLogUrl = (regionId, communicationLogId, currentPage = '') =>
  `/communication-log/region/${regionId}/log/${communicationLogId}/${currentPage}`

const pageComplete = (hookForm, fields) => fields.every((field) => hookForm.getValues(field))

/**
 * this is just a simple handler to "flatten"
 * the JSON column data into the form
 *
 * @param {fn} reset this is the hookForm.reset function (pass it a new set of values and it
 *  replaces the form with those values; it also calls the standard form.reset event
 * @param {*} updatedLog - the log object from the database, which has some
 * information stored at the top level of the object, and some stored in a data column
 */
const resetFormData = (reset, updatedLog) => {
  const { data, updatedAt, recipients, ...fields } = updatedLog

  const form = {
    ...defaultValues,
    ...data,
    ...fields,
    recipients: (recipients || []).map((r) => ({ value: String(r.id), label: r.name })),
  }

  reset(form)
}

export {
  defaultValues,
  defaultLogValues,
  recipientRecordRootUrl,
  formatRecipientCommunicationLogUrl,
  formatRegionalCommunicationLogUrl,
  pageComplete,
  nextStepsFields,
  resetFormData,
}
