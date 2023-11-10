import { WhereOptions, Op } from 'sequelize';
import db from '../models';

const { CommunicationLog } = db;

const createLog = async (
  recipientId: number,
  userId: number,
  data: unknown,
) => CommunicationLog.create({
  recipientId,
  userId,
  data,
});

const logById = async (id: number) => CommunicationLog.findByPk(id);

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
