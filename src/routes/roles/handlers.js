import { getAllRoles } from '../../services/roles';

/* eslint-disable import/prefer-default-export */
export async function allRoles(req, res) {
  const topics = await getAllRoles();
  res.json(topics);
}
