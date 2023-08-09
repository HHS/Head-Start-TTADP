export {};
const genericEnum = require('generic');
const { CollaboratorType } = require('../../models');

const findAll = async () => genericEnum.findAll(CollaboratorType);

const findById = async (
  id: number,
) => genericEnum.findById(CollaboratorType, id);

const create = async (
  data: { name: string, mapsTo?: number },
) => genericEnum.create(CollaboratorType, data);

const updateById = async (
  id: number,
  data: { name?: string, mapsTo?: number },
) => genericEnum.updateById(CollaboratorType, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(CollaboratorType, id);

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
