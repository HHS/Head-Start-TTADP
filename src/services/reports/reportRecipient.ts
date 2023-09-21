import { Op } from 'sequelize';
import db from '../../models';
import { auditLogger } from '../../logger';

const {
  Grant,
  OtherEntity,
  Recipient,
  ReportRecipient,
} = db;

const syncReportRecipients = async (
  reportId: number,
  recipients: ({ grantId?: number, otherEntityId?: number })[],
) => {
  try {
    // get current collaborators for this report having this type
    const currentReportRecipients = await ReportRecipient.findAll({
      attribuites: [],
      where: {
        reportId,
      },
    });
    // filter to the create, update, and delete lists
    const [
      insertList,
      updateList,
      deleteList,
    ] = [
      recipients.filter(({ grantId, otherEntityId }) => !(
        currentReportRecipients.filter((currentReportRecipient) => (
          (grantId && currentReportRecipient.grantId === grantId)
          || (otherEntityId && currentReportRecipient.otherEntityId === otherEntityId)
        )).length
      )),
      recipients.filter(({ grantId, otherEntityId }) => (
        currentReportRecipients.filter((currentReportRecipient) => (
          (grantId && currentReportRecipient.grantId === grantId)
          || (otherEntityId && currentReportRecipient.otherEntityId === otherEntityId)
        )).length
      )),
      currentReportRecipients.filter(({ grantId, otherEntityId }) => !(
        recipients.filter((recipient) => (
          (grantId && recipient.grantId === grantId)
          || (otherEntityId && recipient.otherEntityId === otherEntityId)
        )).length
      )),
    ];
    // in parallel:
    //    perform in insert/update/delete based on the sub lists
    //        if a sub-list is empty, do not call the db at all for that sub-list
    return await Promise.all([
      (insertList && insertList.length)
        ? ReportRecipient.bulkCreate(
          insertList.map(({ grantId, otherEntityId }) => ({
            reportId,
            grantId,
            otherEntityId,
          })),
          { individualHooks: true },
        )
        : Promise.resolve(),
      (updateList && updateList.length)
        ? ReportRecipient.update(
          { updatedAt: new Date() },
          {
            where: {
              reportId,
              [Op.or]: {
                grantId: deleteList
                  .filter(({ grantId }) => grantId)
                  .map(({ grantId }) => grantId),
                otherEntityId: deleteList
                  .filter(({ otherEntityId }) => otherEntityId)
                  .map(({ otherEntityId }) => otherEntityId),
              },
            },
            individualHooks: true,
          },
        )
        : Promise.resolve(),
      (deleteList && deleteList.length)
        ? ReportRecipient.destroy({
          where: {
            reportId,
            [Op.or]: {
              grantId: deleteList
                .filter(({ grantId }) => grantId)
                .map(({ grantId }) => grantId),
              otherEntityId: deleteList
                .filter(({ otherEntityId }) => otherEntityId)
                .map(({ otherEntityId }) => otherEntityId),
            },
          },
          individualHooks: true,
        })
        : Promise.resolve(),
    ]);
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

const includeReportRecipients = () => ({
  model: ReportRecipient,
  as: 'ReportRecipients',
  attributes: [
    // TODO: filter this down to whats needed.
  ],
  includes: [
    {
      model: Grant,
      as: 'grant',
      required: false,
      attributes: [
        // TODO: filter this down to whats needed.
      ],
      include: [{
        model: Recipient,
        as: 'recipient',
        required: true,
        attributes: [
          // TODO: filter this down to whats needed.
        ],
      }],
    },
    {
      model: OtherEntity,
      as: 'otherEntity',
      required: false,
      attributes: [
        // TODO: filter this down to whats needed.
      ],
    },
  ],
});

const getReportRecipients = async (
  reportId: number,
):Promise<object[]> => ReportRecipient.findAll({
  attributes: [
    // TODO: filter this down to whats needed.
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
        // TODO: filter this down to whats needed.
      ],
      include: [{
        model: Recipient,
        as: 'recipient',
        required: true,
        attributes: [
          // TODO: filter this down to whats needed.
        ],
      }],
    },
    {
      model: OtherEntity,
      as: 'otherEntity',
      required: false,
      attributes: [
        // TODO: filter this down to whats needed.
      ],
    },
  ],
});

export {
  syncReportRecipients,
  getReportRecipients,
  includeReportRecipients,
};
