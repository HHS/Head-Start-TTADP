import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withDeliveryMethod(deliveryMethodValue) {
  return sequelize.where(
    sequelize.fn('LOWER', sequelize.col('"ActivityReport".deliveryMethod')),
    {
      [Op.in]: deliveryMethodValue.map((d) => d.toLowerCase()),
    },
  );
}

export function withoutDeliveryMethod(deliveryMethodValue) {
  return sequelize.where(
    sequelize.fn('LOWER', sequelize.col('"ActivityReport".deliveryMethod')),
    {
      [Op.notIn]: deliveryMethodValue.map((d) => d.toLowerCase()),
    },
  );
}
