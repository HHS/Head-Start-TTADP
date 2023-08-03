export {};
const {
  Grant,
  OtherEntity,
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

const getRecipients = async (
  reportId: number,
):Promise<object[]> => ReportRecipient.findAll({
  attributes: [
    // filter this down to whats needed.
  ],
  where: {
    reportId,
  },
  include: [
    {
      model: Grant,
      as: 'grant',
      required: false,
      attributes: [
        // filter this down to whats needed.
      ],
      include: [{
        model: Recipient,
        as: 'recipient',
        required: true,
        attributes: [
          // filter this down to whats needed.
        ],
      }],
    },
    {
      model: OtherEntity,
      as: 'otherEntity',
      required: false,
      attributes: [
        // filter this down to whats needed.
      ],
    },
  ],
});

module.exports = {
  syncRecipients,
  getRecipients,
};
