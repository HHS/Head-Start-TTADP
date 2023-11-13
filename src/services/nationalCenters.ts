import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';

const { NationalCenter, User, Permission } = db;

const { READ_WRITE_TRAINING_REPORTS } = SCOPES;

interface NationalCenterType {
  name: string;
  id: number;
  mapsTo?: number;
}

interface NationalCenterUserType {
  name: string;
  id: number;
}

interface NCModel extends NationalCenterType {
  destroy: (args: { individualHooks: boolean }) => Promise<void>;
  save: () => Promise<void>;
  update: (args: { mapsTo: number }, options: { individualHooks: boolean }) => Promise<void>;
}

export async function findAll(): Promise<NationalCenterType[]> {
  return NationalCenter.findAll({
    attributes: ['id', 'name'],
    include: [{
      // National Center Users.
      model: User,
      as: 'users',
      attributes: ['id', 'name'],
    }],
    order: [['name', 'ASC']],
  });
}

export async function findAllNationalCenterUsers(): Promise<NationalCenterUserType[]> {
  // Get all users that have READ_WRITE_TRAINING_REPORTS permission.
  return User.findAll({
    attributes: ['id', 'name'],
    include: [{
      attributes: [],
      model: Permission,
      as: 'permissions',
      where: { scopeId: READ_WRITE_TRAINING_REPORTS },
    }],
  });
}

export async function findById(id: number): Promise<NCModel> {
  return NationalCenter.findByPk(id);
}

export async function create(nationalCenter
: { name: string, mapsTo?: number }): Promise<NationalCenterType> {
  return NationalCenter.create(nationalCenter);
}

export async function updateById(id: number, data: { name: string })
  : Promise<NationalCenterType> {
  const existing = await findById(id);

  if (existing.name === data.name) {
    auditLogger.info(`Name ${data.name} has not changed`);
    return existing;
  }

  const newCenter = await NationalCenter.create({
    name: data.name,
  }, { individualHooks: false });

  await existing.update({
    mapsTo: newCenter.id,
  }, { individualHooks: true });

  return newCenter;
}

export async function deleteById(id: number) {
  return NationalCenter.destroy({
    where: { id },
    individualHooks: true,
  });
}
