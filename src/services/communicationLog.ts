import { WhereOptions, Op } from 'sequelize';
import db from '../models';

const { sequelize, CommunicationLog } = db;

interface CommLog {
  files: unknown[];
  recipientId: number;
  userId: number;
  id: number;
  data: unknown;
}

const COMMUNICATION_LOGS_PER_PAGE = 10;

const orderLogsBy = (sortBy: string, sortDir: string): string[] => {
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

const LOG_WHERE_OPTIONS = (id: number) => ({
  where: {
    id,
  },
  include: [
    {
      model: db.File,
      as: 'files',
    },
  ],
});

const logById = async (id: number) => CommunicationLog.findOne(LOG_WHERE_OPTIONS(id));

const logsByRecipientAndScopes = async (
  recipientId: number,
  sortBy: string,
  offset: number,
  direction: string,
  scopes: WhereOptions[] = [],
) => CommunicationLog
  .findAndCountAll({
    attributes: {
      include: [
        [
          sequelize.col('author.name'), 'authorName',
        ],
      ],
    },
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
    limit: COMMUNICATION_LOGS_PER_PAGE,
    offset,
  });

const deleteLog = async (id: number) => CommunicationLog.destroy({
  where: {
    id,
  },
});

const updateLog = async (id: number, logData: CommLog) => {
  const { files, ...data } = logData;
  const log = await CommunicationLog.findOne(LOG_WHERE_OPTIONS(id));
  return log.update({ data });
};

export {
  logById,
  logsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
};
