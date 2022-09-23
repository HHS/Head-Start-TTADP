import { Role } from '../models';

/* eslint-disable import/prefer-default-export */
export async function getAllRoles() {
  return Role.findAll({
    raw: true,
  });
}
