import { WhereOptions, Op } from 'sequelize';
import stringify from 'csv-stringify/lib/sync';
import moment from 'moment';
import db from '../models';
import { communicationLogToCsvRecord } from '../lib/transform';
import { SORT_DIR } from '../constants';

const {
  sequelize,
  CommunicationLog,
  CommunicationLogRecipient,
  CommunicationLogFile,
} = db;

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
  RECIPIENT: 'Recipient',
  PURPOSE: 'Purpose',
  GOALS: 'Goals',
  RESULT: 'Result',
  DATE: 'Date',
  ID: 'Log_ID',
};

/**
 * Constructs an order by array for Sequelize based on the sortBy and sortDir inputs
 * IMPORTANT: We need to make sure to include a secondary sort by ID to ensure consistent results
 * when primary sort fields are the same across multiple records (communicationDate, purpose, etc)
 *
 * @param sortBy string
 * @param sortDir 'ASC' | 'DESC'
 * @returns string[] Sequelize order by array
 */
export const orderLogsBy = (sortBy: string, sortDir: string): string[] => {
  const direction = [SORT_DIR.ASC, SORT_DIR.DESC].includes(sortDir.toUpperCase())
    ? sortDir.toUpperCase()
    : SORT_DIR.DESC; // default fallback
  const ALLOWED_SORT_FIELDS = Object.values(COMMUNICATION_LOG_SORT_KEYS);

  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy)
    ? sortBy
    : COMMUNICATION_LOG_SORT_KEYS.DATE;
  let result = [];
  switch (safeSortBy) {
    case COMMUNICATION_LOG_SORT_KEYS.ID:
      result = [[
        sequelize.col('id'), direction,
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.RECIPIENT:
      result = [[
        sequelize.literal(`(
          SELECT MIN(r.name)
          FROM "Recipients" r
          JOIN "CommunicationLogRecipients" clr ON r.id = clr."recipientId"
          WHERE clr."communicationLogId" = "CommunicationLog".id
        ) ${direction}`),
      ], [
        sequelize.col('id'), direction,
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.GOALS:
      result = [[
        sequelize.literal(`(
          SELECT MIN(g->>'label')
          FROM jsonb_array_elements(data->'goals') g
        ) ${direction}`),
      ], [
        sequelize.col('id'), direction,
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.AUTHOR:
      result = [[
        sequelize.literal(`author.name ${direction}`),
      ], [
        sequelize.literal(`(NULLIF(data ->> 'communicationDate',''))::DATE ${direction}`),
      ], [
        sequelize.col('id'), direction,
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.PURPOSE:
      result = [[
        sequelize.literal(`data->>'purpose' ${direction}`),
      ],
      [
        sequelize.col('id'), direction,
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.RESULT:
      result = [[
        sequelize.literal(`data->>'result' ${direction}`),
      ], [
        sequelize.col('id'), direction,
      ]];
      break;
    case COMMUNICATION_LOG_SORT_KEYS.DATE:
    default:
      result = [[
        sequelize.literal(`(NULLIF(data ->> 'communicationDate',''))::DATE ${direction}`),
      ],
      [
        sequelize.col('id'), direction,
      ],
      ];
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
      required: true,
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
  }, { returning: ['id'] });

  await CommunicationLogRecipient.bulkCreate(
    recipientIds.map((recipientId) => ({
      recipientId,
      communicationLogId: log.id,
    })),
  );

  return logById(log.id);
};

const logsByScopes = async (
  sortBy = COMMUNICATION_LOG_SORT_KEYS.ID,
  offset = 0,
  direction = 'desc',
  limit: number = COMMUNICATION_LOGS_PER_PAGE,
  scopes: WhereOptions[] = [],
  format:'json' | 'csv' = 'json',
) => {
  const queryParams = {
    attributes: [
      'id',
    ],
    where: {
      [Op.and]: [
        ...scopes,
      ],
    },
    include: [
      {
        model: db.User,
        attributes: ['name'],
        as: 'author',
      },
    ],
    order: orderLogsBy(sortBy, direction),
  } as {
    attributes: string[];
    where: WhereOptions;
    include: WhereOptions[];
    offset?: number;
    order: string[];
    limit?: number;
  };

  const validatedLimit = (Number.isInteger(limit) && limit > 0 && limit <= 100)
    ? limit
    : COMMUNICATION_LOGS_PER_PAGE;

  if (format === 'json') {
    queryParams.offset = offset;
    queryParams.limit = validatedLimit;
  }

  const scopedLogs = await CommunicationLog.findAndCountAll(queryParams);
  const scopedIds = scopedLogs.rows.map((log) => log.id);
  const logs = await CommunicationLog
    .findAll({
      attributes: LOG_INCLUDE_ATTRIBUTES,
      where: {
        id: scopedIds,
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
    });

  return {
    // using the sequelize literal in the where clause above causes the count to be incorrect
    // given the outer join, so we have to manually count the rows
    count: scopedLogs.count,
    rows: logs,
  };
};

const csvLogsByScopes = async (
  sortBy = 'communicationDate',
  offset = 0,
  direction = 'desc',
  scopes: WhereOptions[] = [],
) => {
  const { rows: logs } = await logsByScopes(
    sortBy,
    offset,
    direction,
    COMMUNICATION_LOGS_PER_PAGE,
    scopes,
    'csv',
  );

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

const csvLogsByRecipientAndScopes = async (
  recipientId: number,
  sortBy = 'communicationDate',
  offset = 0,
  direction = 'desc',
  scopes: WhereOptions[] = [],
) => csvLogsByScopes(
  sortBy,
  offset,
  direction,
  [
    ...scopes,
    {
      id: {
        // we do this instead of an inner join since we want to include other recipients
        // not just the recipient with the specified ID
        [Op.in]: sequelize.literal(`(SELECT "communicationLogId" FROM "CommunicationLogRecipients" WHERE "recipientId" = ${sequelize.escape(recipientId)})`),
      },
    },
  ],
);

const logsByRecipientAndScopes = async (
  recipientId: number,
  sortBy = COMMUNICATION_LOG_SORT_KEYS.ID,
  offset = 0,
  direction = 'desc',
  limit = COMMUNICATION_LOGS_PER_PAGE,
  scopes: WhereOptions[] = [],
) => logsByScopes(
  sortBy,
  offset,
  direction,
  limit,
  [
    ...scopes,
    {
      id: {
        // we do this instead of an inner join since we want to include other recipients
        // not just the recipient with the specified ID
        [Op.in]: sequelize.literal(`(SELECT "communicationLogId" FROM "CommunicationLogRecipients" WHERE "recipientId" = ${sequelize.escape(recipientId)})`),
      },
    },
  ],
);

const deleteLog = async (id: number) => sequelize.transaction(async (transaction) => {
  await CommunicationLogFile.destroy({
    where: {
      communicationLogId: id,
    },
    individualHooks: true,
    transaction,
  });

  await CommunicationLogRecipient.destroy({
    where: {
      communicationLogId: id,
    },
    transaction,
  });

  return CommunicationLog.destroy({
    where: {
      id,
    },
    transaction,
  });
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
