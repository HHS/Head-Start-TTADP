export {};
const {
  CollaboratorType,
  ReportCollaborator,
  Role,
  User,
} = require('../../models');
const { auditLoger } = require('../../logger');

const syncCollaboratorsForType = async (
  reportId: number,
  collaboratorTypeId: number,
  userIds: number[],
) => {
  try {
  // in parallel:
  //    validate that the type is valid for the report type
  //    get current collaborators for this report having this type
  // filter to the positive, nuteral, and negative lists
  // in parallel:
  //    perform in insert/update/delete based on the sub lists
  //        if a sublist is empty, do not call the db at all for that sublist
  } catch (err) {
    auditLoger.error(err);
    throw err;
  }
};

const getCollaboratorsForType = async (
  reportId: number,
  collaboratorType: number | string,
):Promise<object[]> => ReportCollaborator.findAll({
  where: {
    reportId,
  },
  include: [
    {
      model: CollaboratorType,
      as: 'collaboratorTypes',
      required: true,
      where: {
        ...(typeof collaboratorType === 'number' && { id: collaboratorType }),
        ...(typeof collaboratorType !== 'number' && { name: collaboratorType }),
      },
      attributes: [],
      through: {
        attributes: [],
      },
    },
    {
      model: Role,
      as: 'roles',
      required: true,
      attributes: [
        'name',
        'isSpecialist',
      ],
      through: {
        attributes: [],
      },
    },
    {
      model: User,
      as: 'user',
      required: true,
      attributes: [
        // filter this down to whats needed.
      ],
    },
  ],
});

module.exports = {
  syncCollaboratorsForType,
  getCollaboratorsForType,
};
