export {};
const {
  Grant,
  Recipient,
  ReportRecipient,
} = require('../../models');
const { auditLoger } = require('../../logger');

const syncRecipients = async (
  reportId: number,
  recipients: ({ grantId: number } | { otherEntityId: number })[],
) => {
  try {
  // in parallel:
  //    validate that the type is valid for the report type
  //    get current collaborators for this report having this type
  // filter to the positive, nuteral, and negative lists
  // in parallel:
  //    perform in insert/update/delete based on the sub lists
  //        if a sublist is empty, do not call the db at all for that sublist
  } catch (err) {
    auditLoger.error(err);
    throw err;
  }
};

const getRecipients = () => {};
