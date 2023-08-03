const {
  CollaboratorType,
  ReportCollaborator,
  User,
} = require('../../models');

const syncCollaboratorsForType = (
  reportId: number,
  collaboratorTypeId: number,
  userIds: number[],
) => {
  // in parallel:
  //    validate that the type is valid for the report type
  //    get current collaborators for this report having this type
  // filter to the positive, nuteral, and negative lists
  // in parallel:
  //    perform in insert/update/delete based on the sub lists
  //        if a sublist is empty, do not call the db at all for that sublist
};

const getCollaboratorsForTypeId = (
  reportId: number,
  collaboratorTypeId: number,
) => ReportCollaborator.findAll({
  where: {
    reportId,
  },
  include: [
    {
      model: CollaboratorType,
      as: 'collaboratorTypes',
      required: true,
      where: {
        id: collaboratorTypeId,
      },
      attributes: [],
      through: {
        attributes: [],
      },
    },
    {
      model: User,
      as: 'user',
      required: true,
    },
  ],
});

const getCollaboratorsForTypeName = (
  reportId: number,
  collaboratorTypeName: string,
) => ReportCollaborator.findAll({
  where: {
    reportId,
  },
  include: [
    {
      model: CollaboratorType,
      as: 'collaboratorTypes',
      required: true,
      where: {
        name: collaboratorTypeName,
      },
      attributes: [],
      through: {
        attributes: [],
      },
    },
    {
      model: User,
      as: 'user',
      required: true,
    },
  ],
});
