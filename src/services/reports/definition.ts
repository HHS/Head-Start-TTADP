import { RemappingDefinition, remap } from '../../lib/modelUtils';
import db from '../../models';
import { REPORT_TYPE, COLLABORATOR_TYPES, NEXTSTEP_NOTETYPE } from '../../constants';
import { syncReport } from './report';
import { syncReportApproval, includeReportApproval } from './reportApproval';
import { syncReportAudiences, includeReportAudience } from './reportAudience';
import { syncReportCollaboratorsForType, includeReportCollaborator } from './reportCollaborator';
import { syncReportGoals, includeReportGoals } from './reportGoal';
import { syncReportGoalTemplates, includeReportGoalTemplates } from './reportGoalTemplate';
import { syncReportImport, includeReportImport } from './reportImport';
import { syncReportNationalCenters, includeReportNationalCenters } from './reportNationalCenter';
import { syncReportNextSteps, includeReportNextSteps } from './reportNextStep';
import { syncReportObjectives, includeReportObjectives } from './reportObjective';
import { syncReportObjectiveTemplates, includeReportObjectiveTemplates } from './reportObjectiveTemplate';
import { syncReportPageStates, includeReportPageStates } from './reportPageState';
import { syncReportParticipation, includeReportParticipation } from './reportParticipation';
import { syncReportReasons, includeReportReasons } from './reportReason';
import { syncReportRecipients, includeReportRecipients } from './reportRecipient';
import { syncReportResources, includeReportResources } from './reportResource';
import { syncReportTargetPopulations, includeReportTargetPopulations } from './reportTargetPopulation';
import { syncReportTrainingEvent, includeReportTrainingEvent } from './reportTrainingEvent';
import { syncReportTrainingSession, includeReportTrainingSession } from './reportTrainingSession';

const {
  Report,
  ReportApproval,
  ReportAudience,
  ReportCollaborator,
  ReportGoal,
  ReportGoalTemplate,
  ReportImport,
  ReportNationalCenter,
  ReportNextStep,
  ReportObjective,
  ReportObjectiveTemplate,
  ReportPageState,
  ReportParticipation,
  ReportReason,
  ReportRecipient,
  ReportResource,
  ReportTargetPopulation,
  ReportTrainingEvent,
  ReportTrainingSession,
  ValidFor,
} = db;

type ReportDefinition = {
  model: object,
  // eslint-disable-next-line @typescript-eslint/ban-types
  syncer: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  include?: Function | undefined,
  // eslint-disable-next-line @typescript-eslint/ban-types
  get?: Function | undefined,
  // eslint-disable-next-line @typescript-eslint/ban-types
  scope?: Function | undefined,
  remapDefs: { [k: string]: RemappingDefinition }
  type?: string,
}[];

type ReportType = typeof REPORT_TYPE[keyof typeof REPORT_TYPE];

type ReportDefinitions = { [k in ReportType]: ReportDefinition };

const reportDefinitions:ReportDefinitions = {
  [REPORT_TYPE.REPORT_TRAINING_EVENT]: [
    { // Report
      model: Report,
      syncer: syncReport,
      include: undefined,
      get: undefined,
      remapDefs: {
        blob: {
          'data.id': 'id',
          'data.status': 'status.name',
          'data.startDate': 'startDate',
          'data.endDate': 'endDate',
        },
      },
    },
    { // ReportTrainingEvent
      model: ReportTrainingEvent,
      syncer: syncReportTrainingEvent,
      include: includeReportTrainingEvent,
      remapDefs: {
        blob: {
          'data.eventId': '0.eventId',
          regionId: '0.regionId',
          'data.eventName': '0.name',
          'data.eventOrganizer': '0.organizer.name',
          'data.vision': '0.vision',
          'data.trainingType': '0.trainingType',
        },
      },
    },
    { // ReportAudience
      model: ReportAudience,
      syncer: syncReportAudiences,
      include: includeReportAudience,
      remapDefs: {
        blob: {
          'data.audience': '*.name',
        },
      },
    },
    { // ReportCollaborator for COLLABORATOR_TYPES.OWNER
      model: ReportCollaborator,
      syncer: syncReportCollaboratorsForType,
      include: includeReportCollaborator,
      get: undefined,
      type: COLLABORATOR_TYPES.OWNER,
      remapDefs: {
        blob: {
          ownerId: '0.userId',
          'data.owner.id': '0.userId',
          'data.owner.email': '0.user.email',
          'data.owner.name': '0.user.name',
        },
      },
    },
    { // ReportCollaborator for COLLABORATOR_TYPES.INSTANTIATOR
      model: ReportCollaborator,
      syncer: syncReportCollaboratorsForType,
      include: includeReportCollaborator,
      get: undefined,
      type: COLLABORATOR_TYPES.INSTANTIATOR,
      remapDefs: {
        blob: {
          ownerId: '0.userId',
          'data.owner.id': '0.userId',
          'data.owner.email': '0.user.email',
          'data.owner.name': '0.user.name',
        },
      },
    },
    { // ReportCollaborator for COLLABORATOR_TYPES.EDITOR
      model: ReportCollaborator,
      syncer: syncReportCollaboratorsForType,
      include: includeReportCollaborator,
      get: undefined,
      type: COLLABORATOR_TYPES.EDITOR,
      remapDefs: {
        blob: {
          'collaboratorIds.*': '*.userId',
        },
      },
    },
    { // ReportCollaborator for COLLABORATOR_TYPES.POC
      model: ReportCollaborator,
      syncer: syncReportCollaboratorsForType,
      include: includeReportCollaborator,
      get: undefined,
      type: COLLABORATOR_TYPES.POC,
      remapDefs: {
        blob: {
          'pocIds.*': '*.userId',
        },
      },
    },
    { // ReportGoalTemplate
      model: ReportGoalTemplate,
      syncer: syncReportGoalTemplates,
      include: includeReportGoalTemplates,
      remapDefs: {
        blob: {
          'data.goal': '0.templateName',
          regionId: '0.regionId',
          'data.timeframe': '0.timeframe',
          'data.endDate': '0.endDate',
        },
      },
    },
    { // ReportImport
      model: ReportImport,
      syncer: syncReportImport,
      include: includeReportImport,
      remapDefs: {
        blob: {
          imported: '0.data',
        },
      },
    },
    { // ReportNationalCenter
      model: ReportNationalCenter,
      syncer: syncReportNationalCenters,
      include: includeReportNationalCenters,
      remapDefs: {
        blob: {
          'data."National Center(s) Requested".*': '*.name',
        },
      },
    },
    { // ReportPageState
      model: ReportPageState,
      syncer: syncReportPageStates,
      include: includeReportPageStates,
      remapDefs: {
        blob: {
          'data.pageState': '0.pageState',
        },
      },
    },
    { // ReportReason
      model: ReportReason,
      syncer: syncReportReasons,
      include: includeReportReasons,
      remapDefs: {
        blob: {
          'data.reasons.*': '*.name',
        },
      },
    },
    { // ReportResource
      model: ReportResource,
      syncer: syncReportResources,
      include: includeReportResources,
      remapDefs: {
        blob: {
        },
      },
    },
    { // ReportTargetPopulation
      model: ReportTargetPopulation,
      syncer: syncReportTargetPopulations,
      include: includeReportTargetPopulations,
      remapDefs: {
        blob: {
          'data.targetPopulations.*': '*.name',
        },
      },
    },
  ],
  [REPORT_TYPE.REPORT_TRAINING_SESSION]: [
    { // Report
      model: Report,
      syncer: syncReport,
      remapDefs: {
        blob: {
          'data.id': 'id',
          'data.status': 'status.name',
          'data.context': 'context',
          'data.startDate': 'startDate',
          'data.endDate': 'endDate',
        },
      },
    },
    { // ReportTrainingSession
      model: ReportTrainingSession,
      syncer: syncReportTrainingSession,
      include: includeReportTrainingSession,
      remapDefs: {
        blob: {
          'data.eventDisplayId': 'id',
          regionId: 'regionId',
          eventId: 'reportTrainingEventId',
          'data.sessionName': 'name',
        },
      },
    },
    { // ReportCollaborator for COLLABORATOR_TYPES.INSTANTIATOR
      model: ReportCollaborator,
      syncer: syncReportCollaboratorsForType,
      include: includeReportCollaborator,
      type: COLLABORATOR_TYPES.INSTANTIATOR,
      remapDefs: {
        blob: {
          'data.ownerId': '0.id',
          'data.eventOwner': '0.id',
        },
      },
    },
    { // ReportCollaborator for COLLABORATOR_TYPES.OWNER
      model: ReportCollaborator,
      syncer: syncReportCollaboratorsForType,
      include: includeReportCollaborator,
      type: COLLABORATOR_TYPES.OWNER,
      remapDefs: {
        blob: {
          ownerId: '0.id',
        },
      },
    },
    // { // ReportCollaborator for COLLABORATOR_TYPES.EDITOR
    //   model: ReportCollaborator,
    //   syncer: syncReportCollaboratorsForType,
    //   include: includeReportCollaborator,
    //   get: undefined,
    //   type: COLLABORATOR_TYPES.EDITOR,
    //   remapDef: {
    //     'collaboratorIds.*': '*.id',
    //   },
    // },
    // { // ReportCollaborator for COLLABORATOR_TYPES.POC
    //   model: ReportCollaborator,
    //   syncer: syncReportCollaboratorsForType,
    //   include: includeReportCollaborator,
    //   get: undefined,
    //   type: COLLABORATOR_TYPES.POC,
    //   remapDef: {
    //     'pocIds.*': '*.id',
    //   },
    // },
    { // ReportRecipient
      model: ReportRecipient,
      syncer: syncReportRecipients,
      include: includeReportRecipients,
      remapDefs: {
        blob: {
          'data.recipients.*': '*',
        },
      },
    },
    { // ReportObjectiveTemplate
      model: ReportObjectiveTemplate,
      syncer: syncReportObjectiveTemplates,
      include: includeReportObjectiveTemplates,
      remapDefs: {
        blob: {
          'data.objective': '0.title',
          'data.ttaProvided': '0.ttaProvided',
          'data.supportType': '0.supportType',
          'data.files': '0.files',
          'data.objectiveResources': '0.resources',
          'data.topics': '0.topics',
          'data.objectiveTrainers': '0.trainers',
        },
      },
    },
    { // ReportNextStep for NEXTSTEP_NOTETYPE.RECIPIENT
      model: ReportNextStep,
      syncer: syncReportNextSteps,
      include: includeReportNextSteps,
      type: NEXTSTEP_NOTETYPE.RECIPIENT,
      remapDefs: {
        blob: {
          'data.recipientNextSteps.*': '*',
        },
      },
    },
    { // ReportNextStep for NEXTSTEP_NOTETYPE.SPECIALIST
      model: ReportNextStep,
      syncer: syncReportNextSteps,
      include: includeReportNextSteps,
      type: NEXTSTEP_NOTETYPE.SPECIALIST,
      remapDefs: {
        blob: {
          'data.specialistNextSteps.*': '*',
        },
      },
    },
    { // ReportParticipation
      model: ReportParticipation,
      syncer: syncReportParticipation,
      include: includeReportParticipation,
      remapDefs: {
        blob: {
          'data.deliveryMethod': 'deliveryMethod',
          'data.numberOfParticipants': 'numberOfParticipants',
          'data.numberOfParticipantsInPerson': 'numberOfParticipantsInPerson',
          'data.numberOfParticipantsVirtually': 'numberOfParticipantsVirtually',
          'data.participants': 'participants',
        },
      },
    },
    { // ReportPageState
      model: ReportPageState,
      syncer: syncReportPageStates,
      include: includeReportPageStates,
      remapDefs: {
        blob: {
          'data.pageState': 'pageState',
        },
      },
    },
  ],
};

const getSyncersForReportType = (
  reportType: ReportType,
  remapSet: string,
  options?: {
    models: object[],
    exclude: boolean,
  },
) => reportDefinitions[reportType]
  .filter(({
    model,
    syncer,
  }) => (options === undefined
    || (options.exclude && !options.models.includes(model))
    || (!options.exclude && options.models.includes(model)))
    && syncer)
  .map(({
    syncer,
    remapDefs,
    type,
  }) => ({
    syncer,
    remapDef: remapDefs?.[remapSet],
    type,
  }));

const getIncludesForReportType = (
  reportType: ReportType,
  remapSet: string,
  options?: {
    models: object[],
    exclude: boolean,
  },
) => reportDefinitions[reportType]
  .filter(({
    model,
    include,
  }) => (options === undefined
    || (options.exclude && !options.models.includes(model))
    || (!options.exclude && options.models.includes(model)))
    && include)
  .map(({
    model,
    include,
    type,
  }) => ({
    model,
    include,
    type,
  }));

const getGetsForReportType = (
  reportType: ReportType,
  remapSet: string,
  options?: {
    models: object[],
    exclude: boolean,
  },
) => reportDefinitions[reportType]
  .filter(({
    model,
    get,
  }) => (options === undefined
    || (options.exclude && !options.models.includes(model))
    || (!options.exclude && options.models.includes(model)))
    && get)
  .map(({
    get,
    remapDefs,
    type,
  }) => ({
    get,
    remapDef: remapDefs?.[remapSet],
    type,
  }));

const getRemapDefsForReportType = (
  reportType: ReportType,
  remapSet: string,
  options?: {
    models: object[],
    exclude: boolean,
  },
): {
  model: object,
  remapDef: RemappingDefinition,
  type?: string,
}[] => reportDefinitions[reportType]
  .filter(({
    model,
    include,
  }) => (options === undefined
    || (options?.exclude && !options.models.includes(model))
    || (!options?.exclude && options.models.includes(model)))
    && (include || model === Report))
  .map(({
    model,
    remapDefs,
    type,
  }) => ({
    model,
    remapDef: remapDefs?.[remapSet] ?? {},
    ...(type && { type }),
  }));

export {
  type ReportType,
  type ReportDefinition,
  type ReportDefinitions,
  reportDefinitions,
  getSyncersForReportType,
  getIncludesForReportType,
  getGetsForReportType,
  getRemapDefsForReportType,
};
