import { WhereOptions, Op } from 'sequelize';
import db from '../models';

const { CommunicationLog } = db;

interface CommLog {
  files: unknown[];
  recipientId: number;
  userId: number;
  id: number;
  data: unknown;
}

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
  scopes: WhereOptions[] = [],
) => CommunicationLog
  .findAll({
    where: {
      recipientId,
      [Op.and]: [
        ...scopes,
      ],
    },
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
