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

interface IPromptModelInstance extends IPrompt {
  dataValues?: IPrompt;
}

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
  originalFileName: string;
  url: {
    url: string;
  }
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
  activityReportObjectiveTopics: {
    topic: ITopic;
  }[];
  activityReportObjectiveResources: {
    key: number;
    resource: IResource;
  }[];
  activityReportObjectiveFiles: {
    file: IFile;
  }[];
  activityReportObjectiveCourses: {
    course: ICourse;
  }[];
}

interface IObjective {
  id: number;
  goalId: number;
  title: string;
  status: string;
  onApprovedAR: boolean;
  onAR: boolean;
  activityReportObjectives: IActivityReportObjective[];
  topics: ITopic[];
  resources: IResource[];
  files: IFile[];
}

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
};
