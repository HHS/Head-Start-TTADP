import { auditLogger } from '../logger';
import db from '../models';

const { NationalCenter } = db;

interface NationalCenterType {
  name: string;
  id: number;
  mapsTo?: number;
}
interface NCModel extends NationalCenterType {
  destroy: (args: { individualHooks: boolean }) => Promise<void>;
  save: () => Promise<void>;
  update: (args: { mapsTo: number }, options: { individualHooks: boolean }) => Promise<void>;
}

export async function findAll(): Promise<NationalCenterType[]> {
  return NationalCenter.findAll({
    where: {
      mapsTo: null,
    },
    attributes: ['id', 'name', 'mapsTo'],
    order: [['name', 'ASC']],
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
