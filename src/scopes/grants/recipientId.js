import { Op } from 'sequelize';

export function withRecipientId(ids) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return {
    where: {
      recipientId: {
        [Op.in]: idArray,
      },
    },
  };
}

export function withoutRecipientId(ids) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return {
    where: {
      recipientId: {
        [Op.notIn]: idArray,
      },
    },
  };
}
