import { getAllRoles } from '../../services/roles';

/* eslint-disable import/prefer-default-export */
export async function allRoles(req, res) {
  const topics = await getAllRoles();
  res.json(topics);
}

export async function allSpecialistRoles(req, res) {
  const topics = await getAllRoles(true);
  res.json(topics);
}
