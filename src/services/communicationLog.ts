import { WhereOptions, Op } from 'sequelize';
import stringify from 'csv-stringify/lib/sync';
import db from '../models';
import { communicationLogToCsvRecord } from '../lib/transform';

const { sequelize, CommunicationLog } = db;

interface CommLog {
  files: unknown[];
  recipientId: number;
  userId: number;
  id: number;
  data: unknown;
  authorName: string;
  author: {
    id: number;
    name: string;
  }
}

const COMMUNICATION_LOGS_PER_PAGE = 10;

export const orderLogsBy = (sortBy: string, sortDir: string): string[] => {
  let result = [];
  switch (sortBy) {
    case 'authorName':
      result = [[
        sequelize.literal(`author.name ${sortDir}`),
      ], [
        'data.communicationDate',
        sortDir,
      ]];
      break;
    case 'purpose':
      result = [[
        'data.purpose',
        sortDir,
      ],
      [
        'data.communicationDate',
        sortDir,
      ]];
      break;
    case 'result':
      result = [[
        'data.result',
        sortDir,
      ],
      [
        'data.communicationDate',
        sortDir,
      ]];
      break;
    case 'communicationDate':
    default:
      result = [[
        'data.communicationDate',
        sortDir,
      ]];
      break;
  }
  return result;
};

const createLog = async (
  recipientId: number,
  userId: number,
  data: unknown,
) => CommunicationLog.create({
  recipientId,
  userId,
  data,
});

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

const logById = async (id: number) => CommunicationLog.findOne(LOG_WHERE_OPTIONS(id));

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
        recipientId,
        [Op.and]: [
          ...scopes,
        ],
      },
      include: [
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
) => CommunicationLog
  .findAndCountAll({
    attributes: LOG_INCLUDE_ATTRIBUTES,
    where: {
      recipientId,
      [Op.and]: [
        ...scopes,
      ],
    },
    include: [
      {
        model: db.User,
        attributes: [
          'name', 'id',
        ],
        as: 'author',
      },
    ],
    order: orderLogsBy(sortBy, direction),
    limit: limit || undefined,
    offset,
  });

const deleteLog = async (id: number) => CommunicationLog.destroy({
  where: {
    id,
  },
});

const updateLog = async (id: number, logData: CommLog) => {
  const {
    files,
    id: logId,
    userId,
    recipientId,
    author,
    authorName,
    ...data
  } = logData;
  const log = await CommunicationLog.findOne(LOG_WHERE_OPTIONS(id));
  return log.update({ data });
};

export {
  logById,
  logsByRecipientAndScopes,
  csvLogsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
};
