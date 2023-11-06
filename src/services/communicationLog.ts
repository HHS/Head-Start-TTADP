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

const logsByRecipientId = async (recipientId: number) => {
  const logs = await CommunicationLog.findAll({
    where: {
      recipientId,
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
  logsByRecipientId,
  deleteLog,
  updateLog,
  createLog,
};
