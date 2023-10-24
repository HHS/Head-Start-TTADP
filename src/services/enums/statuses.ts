import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { Status } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(Status, data);

const findByPk = async (
  id: number,
) => genericEnum.findByPk(Status, id);

const findByName = async (
  name: string,
  validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
) => genericEnum.findByName(Status, name, validFor);

const create = async (
  data: {
    name: string,
    isTerminal: boolean,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.create(Status, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    isTerminal?: boolean,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(Status, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Status, id);

export {
  findAll,
  findByPk,
  findByName,
  create,
  updateById,
  deleteById,
};
