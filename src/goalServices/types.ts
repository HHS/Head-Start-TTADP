interface ICourse {
  name: string;
}

interface ITopic {
  name: string;
}

interface IResource {
  value: string;
}

interface IFile {
  key: string;
  originalFileName: string;
  url: {
    url: string;
  }
}

interface IPromptModelInstance extends IPrompt {
  dataValues?: IPrompt;
  toJSON?: () => IPrompt;
}

interface ITopicModelInstance extends ITopic {
  dataValues?: ITopic;
  toJSON?: () => ITopic;
}
interface IFileModelInstance extends IFile {
  dataValues?: IFile
  toJSON?: () => IFile;
}

interface IResourceModelInstance extends IResource {
  dataValues?: IResource;
  toJSON?: () => IResource;
}

interface ICourseModelInstance extends ICourse {
  dataValues?: ICourse;
  toJSON?: () => ICourse;
}

interface IActivityReportObjective {
  id: number;
  objectiveId: number;
  activityReportId: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  status: string;
  endDate: string;
  isActivelyEdited: boolean;
  source: string;
  arOrder: number;
  objectiveCreatedHere: boolean | null;
  supportType: string;
  ttaProvided: string;
  closeSuspendReason: string;
  closeSuspendContext: string;
  activityReportObjectiveTopics: {
    topic: ITopic;
  }[];
  activityReportObjectiveResources: {
    key: number;
    resource: IResource;
  }[];
  activityReportObjectiveFiles: {
    file: IFileModelInstance;
  }[];
  activityReportObjectiveCourses: {
    course: ICourse;
  }[];
}

interface IActivityReportObjectivesFromDB extends IActivityReportObjective {
  toJSON: () => IActivityReportObjective;
  dataValues?: IActivityReportObjective;
}

interface IGrant {
  id: number;
  regionId: number;
  status: string;
  startDate: string;
  endDate: string;
  oldGrantId: number;
  recipientId: number;
  numberWithProgramTypes: string;
  number: string;
  name: string;
  recipient: {
    name: string;
    id: number;
    dataValues?: {
      name: string;
      id: number;
    }
  }
}

interface IGrantModelInstance extends IGrant {
  dataValues?: IGrant
}

interface IPrompt {
  responses?: {
    response: string[];
  }[];
  promptId?: number;
  ordinal: number;
  title: string;
  prompt: string;
  hint: string;
  fieldType: string;
  options: string;
  validations: string;
  response: string[];
  reportResponse: string[];
  allGoalsHavePromptResponse: boolean;
}

interface IActivityReportGoal {
  id: number;
  goalId: number;
  activityReportId: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  status: string;
  endDate: string;
  isActivelyEdited: boolean;
  source: string;
}

interface IObjective {
  id: number;
  title: string;
  status: string;
  goalId: number;
  onApprovedAR: boolean;
  onAR: boolean;
  rtrOrder: number;
  activityReportObjectives: IActivityReportObjectivesFromDB[];
  topics: ITopic[];
  resources: IResource[];
  files: IFile[];
  courses: ICourse[];
  otherEntityId: number | null;
  activityReports?: {
    id: number
  }[];
}

interface IObjectiveModelInstance extends IObjective {
  dataValues?: IObjective
  getDataValue?: (key: string) => number | string | boolean | null;
  toJSON?: () => IObjective;
}

type IReducedObjective = Omit <IObjective, 'activityReportObjectives'> & {
  topics: ITopic[];
  resources: IResource[];
  files: IFile[];
  courses: ICourse[];
  ids: number[];
  recipientIds?: number[];
  otherEntityId?: number;
};

interface IGoalForRTRQuery {
  id: number;
  endDate: string;
  name: string;
  status: string;
  regionId: number;
  recipientId: number;
  goalNumber: string;
  createdVia: string;
  goalTemplateId: number;
  source: string;
  onAR: boolean;
  onApprovedAR: boolean;
  isCurated: boolean;
  rtrOrder: number;
  statusChanges: { oldStatus: string }[]
  objectives: IObjectiveModelInstance[];
  goalCollaborators: {
    id: number;
    collaboratorType: { name: string };
    user: {
      name: string;
      userRoles: {
        role: { name: string };
      }[];
    };
  }[];
  grant: IGrantModelInstance;
  prompts: IPromptModelInstance[];
  goalTemplateFieldPrompts: {
    promptId: number;
    ordinal: number;
    title: string;
    prompt: string;
    hint: string;
    fieldType: string;
    options: string;
    validations: string;
    responses: { response: string }[];
    reportResponses: {
      response: string;
      activityReportGoal: {
        activityReportId: number;
        activityReportGoalId: number;
      };
    }[];
  }[];
}

interface IGoalForRTRForm extends IGoalForRTRQuery {
  toJSON: () => IGoalForRTRQuery;
  dataValues: IGoalForRTRQuery;
}

type IGoalForRTRQueryWithReducedObjectives = Omit <IGoalForRTRForm, 'objectives'> & {
  isReopenedGoal: boolean;
  objectives: IReducedObjective[];
};

interface IGoal {
  id: number;
  name: string;
  endDate: string;
  isCurated: boolean;
  grantId: number;
  createdVia: string;
  source: string | {
    [key: string]: string,
  };
  onAR: boolean;
  onApprovedAR: boolean;
  prompts: IPromptModelInstance[];
  activityReportGoals: IActivityReportGoal[];
  objectives: IObjective[];
  grant: IGrantModelInstance;
  status: string;
  goalNumber: string;
  statusChanges?: { oldStatus: string }[]
  goalCollaborators?: {
    collaboratorType: {
      name: string;
    };
    user: {
      name: string;
      userRoles: {
        role: {
          name: string;
        }
      }[]
    }
  }[];
  collaborators?: {
    [key: string]: string;
  }[];
}

interface IGoalModelInstance extends IGoal {
  dataValues?: IGoal
}

export {
  IGrant,
  IPrompt,
  ICourse,
  ITopic,
  IResource,
  IFile,
  IActivityReportGoal,
  IActivityReportObjective,
  IObjective,
  IGoal,
  // -- model version of the above -- //
  IGoalModelInstance,
  IGrantModelInstance,
  IPromptModelInstance,
  ICourseModelInstance,
  ITopicModelInstance,
  IResourceModelInstance,
  IFileModelInstance,
  IObjectiveModelInstance,
  IActivityReportObjectivesFromDB,
  // -- for the rtr query, slightly distinct types are used -- //
  IGoalForRTRQueryWithReducedObjectives,
  IGoalForRTRForm,
  IReducedObjective,
};
