import { Op } from 'sequelize';
import { Role } from '../models';

/* eslint-disable import/prefer-default-export */
export async function getAllRoles(onlySpecialistRoles = false) {
  let where = { deletedAt: { [Op.eq]: null } };
  if (onlySpecialistRoles) {
    where = {
      ...where,
      isSpecialist: true,
    };
  }
  return Role.findAll({
    raw: true,
    where,
  });
}
