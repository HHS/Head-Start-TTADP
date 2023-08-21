const {
  REPORT_TYPE,
  ENTITY_TYPE,
  COLLABORATOR_TYPES,
  NEXTSTEP_NOTETYPE,
} = require('../../constants');

const reportDataMatrix = (models) => ({
  [models.Report.name]: {
    model: models.Report,
    type: ENTITY_TYPE.REPORT,
    prefix: 'report',
    associations: {
      [models.ReportCollaborator.name]: [
        {},
        {
          method:['collaboratorType', COLLABORATOR_TYPES.OWNER],
          as: `${COLLABORATOR_TYPES.OWNER}s`,
          associationType: 'hasOne'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR],
          as: `${COLLABORATOR_TYPES.INSTANTIATOR}s`,
          associationType: 'hasOne'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.EDITOR],
          as: `${COLLABORATOR_TYPES.EDITOR}s`,
          associationType: 'hasMany'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.POC],
          as: `${COLLABORATOR_TYPES.POC}s`,
          associationType: 'hasMany'
        },
      ],
    },
  },
  [models.ReportTrainingEvent.name]: {
    model: models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] }),
    type: ENTITY_TYPE.REPORT_TRAINING_EVENT,
    prefix: 'reportTrainingEvent',
    associations: {
      [models.ReportCollaborator.name]: [
        {},
        {
          method:['collaboratorType', COLLABORATOR_TYPES.OWNER],
          as: `${COLLABORATOR_TYPES.OWNER}`,
          associationType: 'hasOne'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR],
          as: `${COLLABORATOR_TYPES.INSTANTIATOR}`,
          associationType: 'hasOne'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.EDITOR],
          as: `${COLLABORATOR_TYPES.EDITOR}s`,
          associationType: 'hasMany'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.POC],
          as: `${COLLABORATOR_TYPES.POC}s`,
          associationType: 'hasMany'
        },
      ],
      [models.ReportGoalTemplate.name]: [{}],
      [models.ReportReason.name]: [{}],
      [models.ReportNationalCenter.name]: [{}],
      [models.ReportTargetPopulation.name]: [{}],
      [models.ReportImport.name]: [{}],
      [models.ReportPageState.name]: [{}],
    },
  },
  [models.ReportTrainingSession.name]: {
    model: models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_SESSION] }),
    type: ENTITY_TYPE.REPORT_TRAINING_SESSION,
    prefix: 'reportTrainingSession',
    associations: {
      [models.ReportCollaborator.name]: [
        {},
        {
          method:['collaboratorType', COLLABORATOR_TYPES.OWNER],
          as: `${COLLABORATOR_TYPES.OWNER}s`,
          associationType: 'hasOne'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR],
          as: `${COLLABORATOR_TYPES.INSTANTIATOR}s`,
          associationType: 'hasOne'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.EDITOR],
          as: `${COLLABORATOR_TYPES.EDITOR}s`,
          associationType: 'hasMany'
        },
        {
          method:['collaboratorType', COLLABORATOR_TYPES.POC],
          as: `${COLLABORATOR_TYPES.POC}s`,
          associationType: 'hasMany'
        },
      ],
      [models.ReportGoalTemplate.name]: [{}],
      [models.ReportObjectiveTemplate.name]: [{}],
      [models.ReportObjectiveTemplateFile.name]: [{}],
      [models.ReportObjectiveTemplateResource.name]: [{}],
      [models.ReportObjectiveTemplateTopic.name]: [{}],
      [models.ReportGoal.name]: [{}],
      [models.ReportObjective.name]: [{}],
      [models.ReportObjectiveFile.name]: [{}],
      [models.ReportObjectiveResource.name]: [{}],
      [models.ReportObjectiveTopic.name]: [{}],
      [models.ReportRecipient.name]: [{}],
      [models.ReportNextStep.name]: [
        {
          as: `s`,
          associationType: 'hasMany'
        },
        {
          method: ['noteType', NEXTSTEP_NOTETYPE.RECIPIENT],
          as: `For${NEXTSTEP_NOTETYPE.RECIPIENT}s`,
          associationType: 'hasMany'
        },
        {
          method: ['noteType', NEXTSTEP_NOTETYPE.SPECIALIST],
          as: `For${NEXTSTEP_NOTETYPE.SPECIALIST}s`,
          associationType: 'hasMany'
        },
      ],
      [models.ReportPageState.name]: [{}],
    },
  },
});

const collectReportMatrixAssociationsForModel = (models, modelName) => {
  const matrix = reportDataMatrix(models);
  console.log('#####', matrix);
  const reducedMatrix = Object.values(matrix)
    .reduce((acc, reportType) => {
      const associationsRequired = reportType.associations[modelName];
      if (associationsRequired) {
        acc.push({
          model: reportType.model,
          type: reportType.type,
          prefix: reportType.prefix,
          associations: associationsRequired,
        });
      }
      return acc;
    }, []);
  return reducedMatrix;
}

export {
  reportDataMatrix,
  collectReportMatrixAssociationsForModel,
};

