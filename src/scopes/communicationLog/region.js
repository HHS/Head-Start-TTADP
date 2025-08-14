import { Op } from 'sequelize';
import db from '../../models';

const { sequelize } = db;

export function withRegion(regions) {
  return {
    [Op.and]: [
      sequelize.literal(`
        ("CommunicationLog"."data"#>>'{regionId}')::integer IN (${regions.map((regionId) => sequelize.escape(regionId)).join(',')})
      `),
    ],
  };
}

export function withoutRegion(regions) {
  return {
    [Op.and]: [
      sequelize.literal(`
        ("CommunicationLog"."data"#>>'{regionId}')::integer NOT IN (${regions.map((regionId) => sequelize.escape(regionId)).join(',')})
      `),
    ],
  };
}
