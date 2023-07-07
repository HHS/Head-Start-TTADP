import { auditLogger } from '../logger';
import db from '../models';

const { NationalCenter } = db;

interface NationalCenterType {
  name: string;
  id: number;
  mapsTo?: number;
}
interface NCModel extends NationalCenterType {
  destroy: () => Promise<void>;
  save: () => Promise<void>;
}

export async function findAll(): Promise<NationalCenterType[]> {
  return NationalCenter.findAll({
    attributes: ['id', 'name'],
    order: [['name', 'ASC']],
    raw: true,
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

  await existing.destroy();

  return NationalCenter.create({
    name: data.name,
    mapsTo: id,
  });
}

export async function deleteById(id: number) {
  return NationalCenter.destroy({
    where: { id },
  });
}
