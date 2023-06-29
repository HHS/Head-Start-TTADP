import db from '../models';

const { NationalCenter } = db;

interface NationalCenterType {
  name: string;
  mapsTo?: number;
}

export async function findAll() {
  return NationalCenter.findAll({
    attributes: ['id', 'name', 'mapsTo'],
    order: [['name', 'ASC']],
    raw: true,
  });
}

export async function findById(id: number) {
  return NationalCenter.findByPk(id);
}

export async function create(nationalCenter: NationalCenterType) {
  return NationalCenter.create(nationalCenter);
}

export async function updateById(id: number, nationalCenter: NationalCenterType) {
  return NationalCenter.update(nationalCenter, {
    where: { id },
  });
}

export async function deleteById(id: number) {
  return NationalCenter.destroy({
    where: { id },
  });
}
