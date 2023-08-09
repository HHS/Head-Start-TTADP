export {};
const genericEnum = require('generic');
const { Status } = require('../../models');
const {
  ENTITY_TYPE,
} = require('../../constants');

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(Status, data);

const findById = async (
  id: number,
) => genericEnum.findById(Status, id);

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

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
