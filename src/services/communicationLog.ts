import { WhereOptions, Op } from 'sequelize';
import stringify from 'csv-stringify/lib/sync';
import moment from 'moment';
import db from '../models';
import { communicationLogToCsvRecord } from '../lib/transform';

const { sequelize, CommunicationLog, CommunicationLogRecipient } = db;

interface CommLogData {
  id: number;
  communicationDate?: string;
  purpose?: string;
  result?: string;
  recipients: {
    value: string | number;
    label: string;
  }[];
  authorName?: string;
  author: {
    value: string | number;
    label: string;
  };
  files?: {
    id: number
  }[];
  userId: number;
}

export const formatCommunicationDateWithJsonData = (data: CommLogData): CommLogData => {
  if (data.communicationDate) {
    const formattedCommunicationDate = moment(data.communicationDate, 'MM/DD/YYYY').format('MM/DD/YYYY');

    if (formattedCommunicationDate === 'Invalid date') {
      return {
        ...data,
        communicationDate: '',
      };
    }

    if (formattedCommunicationDate !== data.communicationDate) {
      return {
        ...data,
        communicationDate: formattedCommunicationDate,
      };
    }
  }

  return data;
};

const COMMUNICATION_LOGS_PER_PAGE = 10;

export const COMMUNICATION_LOG_SORT_KEYS = {
  AUTHOR: 'Creator_name',
  PURPOSE: 'Purpose',
  RESULT: 'Result',
  DATE: 'Date',
};

export const orderLogsBy = (sortBy: string, sortDir: string): string[] => {
  let result = [];
  switch (sortBy) {
    case COMMUNICATION_LOG_SORT_KEYS.AUTHOR:
      result = [[
        sequelize.literal(`author.name ${sortDir}`),
      ], [
        sequelize.literal(`(NULLIF(data ->> 'communicationDate',''))::DATE ${sortDir}`),
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.PURPOSE:
      result = [[
        'data.purpose',
        sortDir,
      ],
      [
        sequelize.literal(`(NULLIF(data ->> 'communicationDate',''))::DATE ${sortDir}`),
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.RESULT:
      result = [[
        'data.result',
        sortDir,
      ],
      [
        sequelize.literal(`(NULLIF(data ->> 'communicationDate',''))::DATE ${sortDir}`),
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.DATE:
    default:
      result = [[
        sequelize.literal(`(NULLIF(data ->> 'communicationDate',''))::DATE ${sortDir}`),
      ]];
      break;
  }
  return result;
};

const LOG_INCLUDE_ATTRIBUTES = {
  include: [
    [
      sequelize.col('author.name'), 'authorName',
    ],
  ],
  exclude: ['recipientId'], // I don't fully understand why we have to do this, the column has been removed from the model and the DB but still Sequelize tries to give it to me
};

const LOG_WHERE_OPTIONS = (id: number) => ({
  where: {
    id,
  },
  include: [
    {
      model: db.Recipient,
      as: 'recipients',
    },
    {
      model: db.File,
      as: 'files',
    },
    {
      model: db.User,
      attributes: [
        'name',
        'id',
      ],
      as: 'author',
    },
  ],
});

const logById = async (id: number) => CommunicationLog.findOne({
  ...LOG_WHERE_OPTIONS(id),
  attributes: LOG_INCLUDE_ATTRIBUTES,
});

const createLog = async (
  recipientIds: number[],
  userId: number,
  data: CommLogData,
) => {
  const log = await CommunicationLog.create({
    userId,
    data: formatCommunicationDateWithJsonData(data),
  // I don't fully understand why we have to do this, the recipientId column has been removed from
  // the model and the DB but still Sequelize tries to give it to me
  }, { returning: ['id'] });

  await CommunicationLogRecipient.bulkCreate(
    recipientIds.map((recipientId) => ({
      recipientId,
      communicationLogId: log.id,
    })),
  );

  return logById(log.id);
};

const csvLogsByRecipientAndScopes = async (
  recipientId: number,
  sortBy = 'communicationDate',
  offset = 0,
  direction = 'desc',
  scopes: WhereOptions[] = [],
) => {
  const logs = await CommunicationLog
    .findAll({
      attributes: LOG_INCLUDE_ATTRIBUTES,
      where: {
        [Op.and]: [
          ...scopes,
        ],
      },
      include: [
        {
          model: db.Recipient,
          as: 'recipients',
          required: true,
          where: {
            id: recipientId,
          },
        },
        {
          model: db.User,
          attributes: [
            'name',
            'id',
          ],
          as: 'author',
        },
        {
          model: db.File,
          as: 'files',
          attributes: [
            'id',
            'originalFileName',
          ],
        },
      ],
      order: orderLogsBy(sortBy, direction),
      offset,
    });

  // convert to csv
  const data = await Promise.all(logs.map((log) => communicationLogToCsvRecord(log)));

  // base options
  const options = {
    header: true,
    quoted: true,
    quoted_empty: true,
  };

  return stringify(
    data,
    options,
  );
};

const logsByRecipientAndScopes = async (
  recipientId: number,
  sortBy = 'communicationDate',
  offset = 0,
  direction = 'desc',
  limit = COMMUNICATION_LOGS_PER_PAGE || false,
  scopes: WhereOptions[] = [],
) => {
  const logs = await CommunicationLog
    .findAll({
      attributes: LOG_INCLUDE_ATTRIBUTES,
      where: {
        [Op.and]: [
          ...scopes,
          {
            id: {
              [Op.in]: sequelize.literal(`(SELECT "communicationLogId" FROM "CommunicationLogRecipients" WHERE "recipientId" = ${sequelize.escape(recipientId)})`),
            },
          },
        ],
      },
      include: [
        {
          model: db.Recipient,
          as: 'recipients',
          required: false,
        },
        {
          model: db.File,
          as: 'files',
          required: false,
        },
        {
          model: db.User,
          attributes: [
            'name',
            'id',
          ],
          as: 'author',
        },
      ],
      order: orderLogsBy(sortBy, direction),
      limit: limit || undefined,
      offset,
      subQuery: false,
    });

  return {
    // using the sequelize literal in the where clause above causes the count to be incorrect
    // given the outer join, so we have to manually count the rows
    count: logs.length,
    rows: logs,
  };
};

const csvLogsByScopes = async (
  sortBy = 'communicationDate',
  offset = 0,
  direction = 'desc',
  scopes: WhereOptions[] = [],
) => {
  const logs = await CommunicationLog
    .findAll({
      attributes: LOG_INCLUDE_ATTRIBUTES,
      where: {
        [Op.and]: [
          ...scopes,
        ],
      },
      include: [
        {
          model: db.Recipient,
          as: 'recipients',
          required: false,
        },
        {
          model: db.File,
          as: 'files',
          required: false,
        },
        {
          model: db.User,
          attributes: [
            'name',
            'id',
          ],
          as: 'author',
        },
      ],
      order: orderLogsBy(sortBy, direction),
      offset,
      subQuery: false,
    });

  // convert to csv
  const data = await Promise.all(logs.map((log) => communicationLogToCsvRecord(log)));

  // base options
  const options = {
    header: true,
    quoted: true,
    quoted_empty: true,
  };

  return stringify(
    data,
    options,
  );
};

const logsByScopes = async (
  sortBy = 'communicationDate',
  offset = 0,
  direction = 'desc',
  limit = COMMUNICATION_LOGS_PER_PAGE || false,
  scopes: WhereOptions[] = [],
) => {
  const logs = await CommunicationLog
    .findAll({
      attributes: LOG_INCLUDE_ATTRIBUTES,
      where: {
        [Op.and]: [
          ...scopes,
        ],
      },
      include: [
        {
          model: db.Recipient,
          as: 'recipients',
          required: false,
        },
        {
          model: db.File,
          as: 'files',
          required: false,
        },
        {
          model: db.User,
          attributes: [
            'name',
            'id',
          ],
          as: 'author',
        },
      ],
      order: orderLogsBy(sortBy, direction),
      limit: limit || undefined,
      offset,
      subQuery: false,
    });

  return {
    // using the sequelize literal in the where clause above causes the count to be incorrect
    // given the outer join, so we have to manually count the rows
    count: logs.length,
    rows: logs,
  };
};

const deleteLog = async (id: number) => CommunicationLog.destroy({
  where: {
    id,
  },
});

const updateLog = async (id: number, logData: CommLogData) => {
  const {
    files,
    id: logId,
    userId,
    author,
    authorName,
    recipients,
    ...data
  } = logData;

  const recipientIds = recipients.map((recipient) => Number(recipient.value));

  await CommunicationLogRecipient.destroy({
    where: {
      communicationLogId: id,
      recipientId: {
        [Op.notIn]: recipientIds,
      },
    },
  });

  await CommunicationLogRecipient.bulkCreate(
    recipientIds.map((recipientId) => ({
      recipientId,
      communicationLogId: id,
    })),
    {
      ignoreDuplicates: true,
    },
  );

  await CommunicationLog.update({
    data: formatCommunicationDateWithJsonData(data as CommLogData),
  }, {
    where: {
      id,
    },
  });

  return logById(id);
};

export {
  logById,
  logsByRecipientAndScopes,
  csvLogsByRecipientAndScopes,
  logsByScopes,
  csvLogsByScopes,
  deleteLog,
  updateLog,
  createLog,
};
