import { WhereOptions, Op } from 'sequelize';
import db from '../models';

const { CommunicationLog } = db;

const createLog = async (recipientId: number, userId: number, data: unknown) => {
  const log = await CommunicationLog.create({
    recipientId,
    userId,
    data,
  });
  return log;
};

const logById = async (id: number) => {
  const log = await CommunicationLog.findByPk(id);
  return log;
};

const logsByRecipientAndScopes = async (recipientId: number, scopes: WhereOptions[] = []) => {
  const logs = await CommunicationLog.findAll({
    where: {
      recipientId,
      [Op.and]: [
        ...scopes,
      ],
    },
  });
  return logs;
};

const deleteLog = async (id: number) => CommunicationLog.destroy({
  where: {
    id,
  },
});

const updateLog = async (id: number, data: unknown) => {
  const log = await CommunicationLog.findByPk(id);
  return log.update(data);
};

export {
  logById,
  logsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
};
