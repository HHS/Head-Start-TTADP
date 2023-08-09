export {};
const genericEnum = require('generic');
const { Reasons } = require('../../models');
const {
  ENTITY_TYPE,
} = require('../../constants');

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(Reasons);

const findById = async (
  id: number,
) => genericEnum.findById(Reasons, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number },
) => genericEnum.create(Reasons, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(Reasons, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Reasons, id);

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
