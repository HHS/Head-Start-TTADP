import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function formatDeliveryMethod(deliveryMethod) {
  const method = deliveryMethod.toLowerCase();
  if (method === 'in person') {
    return 'in-person';
  }

  return method;
}

export function withDeliveryMethod(deliveryMethodValue) {
  const methods = deliveryMethodValue.map(formatDeliveryMethod);

  return sequelize.where(
    sequelize.fn('LOWER', sequelize.col('"ActivityReport".deliveryMethod')),
    {
      [Op.in]: methods,
    },
  );
}

export function withoutDeliveryMethod(deliveryMethodValue) {
  const methods = deliveryMethodValue.map(formatDeliveryMethod);

  return sequelize.where(
    sequelize.fn('LOWER', sequelize.col('"ActivityReport".deliveryMethod')),
    {
      [Op.notIn]: methods,
    },
  );
}
