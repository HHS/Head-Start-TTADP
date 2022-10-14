import { getAllRoles } from '../../services/roles';

/* eslint-disable import/prefer-default-export */
export async function allRoles(req, res) {
  const { onlySpecialist } = req.query;
  const topics = await getAllRoles(onlySpecialist);
  res.json(topics);
}
