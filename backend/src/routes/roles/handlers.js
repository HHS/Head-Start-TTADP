import { getAllRoles } from '../../services/roles';

export async function allRoles(req, res) {
  const roles = await getAllRoles();
  res.json(roles);
}

export async function allSpecialistRoles(req, res) {
  const roles = await getAllRoles(true);
  res.json(roles);
}
