interface IPrompt {
  ordinal: number;
  title: string;
  prompt: string;
  hint: string;
  fieldType: string;
  options: string;
  validations: string;
  promptId?: number;
  response?: string[];
  responses?: {
    response: string[];
  }[];
  reportResponse?: string[];
  reportResponses?: {
    response: string[];
  }[];
  dataValues?: IPrompt;
  toJSON?: () => IPrompt;
  grantId?: number;
  grantDisplayName?: string;
}

interface IReviewPrompt {
  key: string;
  promptId: number;
  responses: string[];
  grantId?: number;
  grantDisplayName?: string;
  recipients:
  {
    id: number;
    name: string;
  }[];
}

interface ITopic {
  name: string;
}

interface ITopicModelInstance extends ITopic {
  dataValues?: ITopic;
  toJSON?: () => ITopic;
}

interface IFile {
  key: string;
  originalFileName: string;
  url: {
    url: string;
  }
}

interface IFileModelInstance extends IFile {
  dataValues?: IFile
  toJSON?: () => IFile;
}

interface IResource {
  value: string;
}

interface IResourceModelInstance extends IResource {
  dataValues?: IResource;
  toJSON?: () => IResource;
}

interface ICourse {
  name: string;
}

interface ICitation {
  citation: string;
}

interface ICourseModelInstance extends ICourse {
  dataValues?: ICourse;
  toJSON?: () => ICourse;
}

interface ICitationModelInstance extends ICourse {
  dataValues?: ICitation;
  toJSON?: () => ICitation;
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
  useIpdCourses?: boolean;
  useFiles?: boolean;
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
  activityReportObjectiveCitations: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataValues: any;
    citation: string;
    monitoringReferences: JSON;
  }[];
}

interface IActivityReportObjectivesModelInstance extends IActivityReportObjective {
  toJSON: () => IActivityReportObjective;
  dataValues?: IActivityReportObjective;
}

interface IGrant {
  id: number;
  regionId: number;
  status: string;
  startDate: string;
  endDate: string;
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
  goalId?: number;
  recipientNameWithPrograms: string;
}

interface IGrantModelInstance extends IGrant {
  dataValues?: IGrant
}

interface IActivityReportGoal {
  id: number;
  goalId: number;
  activityReportId: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  status: string;
  isActivelyEdited: boolean;
  source: string | {
    [key: string]: string;
  };
  closeSuspendReason: string;
  closeSuspendContext: string;
  originalGoalId: number;
}

interface IObjective {
  id: number;
  title: string;
  status: string;
  goalId: number;
  onApprovedAR: boolean;
  onAR: boolean;
  rtrOrder: number;
  activityReportObjectives?: IActivityReportObjectivesModelInstance[];
  otherEntityId: number | null;
  activityReports?: {
    id: number
  }[];
  grantId?: number;
  supportType?: string;
  onAnyReport?: boolean;
  closeSuspendReason?: string;
  closeSuspendContext?: string;
  useIpdCourses?: boolean;
  useFiles?: boolean;
  topics: ITopic[];
  resources: IResource[];
  files: IFile[];
  courses: ICourse[];
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

interface IGoalCollaborator {
  id: number;
  collaboratorType: {
    name: string;
    mapsToCollaboratorType: string;
  };
  user: {
    name: string;
    userRoles: {
      id: number;
      role: {
        name: string;
      };
    }[];
  };
}

interface IGoal {
  id: number;
  name: string;
  isCurated: boolean;
  grantId: number;
  createdVia: string;
  source: string;
  goalTemplateId: number;
  onAR: boolean;
  onApprovedAR: boolean;
  prompts: IPrompt[];
  activityReportGoals: IActivityReportGoal[];
  objectives: IObjective[];
  grant: IGrantModelInstance;
  status: string;
  goalNumber: string;
  statusChanges?: { oldStatus: string }[];
  rtrOrder: number;
  goalCollaborators: IGoalCollaborator[];
  goalNumbers: string[];
  goalIds: number[];
  grants: IGrant[];
  grantIds: number[];
  isNew: boolean;
  isReopenedGoal: boolean;
  isSourceEditable: boolean;
  collaborators: {
    goalNumber: string;
    goalCreator: IGoalCollaborator;
    goalCreatorName: string;
    goalCreatorRoles: string;
  }[];
}

interface IReducedGoal {
  id: number;
  name: string;
  status: string;
  regionId: number;
  recipientId: number;
  goalTemplateId: number;
  createdVia: string;
  source: {
    [key: string]: string;
  } | string;
  onAR: boolean;
  onApprovedAR: boolean;
  isCurated: boolean;
  rtrOrder: number;
  goalCollaborators: IGoalCollaborator[];
  objectives: IReducedObjective[];
  prompts : {
    [x: string]: IPrompt[];
  } | IPrompt[];
  promptsForReview: IReviewPrompt[];
  statusChanges?: { oldStatus: string }[];
  goalNumber: string;
  goalNumbers: string[];
  goalIds: number[];
  grant: IGrant;
  grants: IGrant[];
  grantId: number;
  grantIds: number[];
  isNew: boolean;
  isReopenedGoal: boolean;
  collaborators: {
    goalNumber?: string;
    goalCreatorName: string;
    goalCreatorRoles: string;
  }[];
  activityReportGoals?: IActivityReportGoal[];
  isSourceEditable: boolean;
}

interface IGoalModelInstance extends IGoal {
  dataValues?: IGoal
  toJSON?: () => IGoal;
}

interface IOtherEntityObjective {
  activityReportObjectives: IActivityReportObjectivesModelInstance[];
  id: 9,
  otherEntityId: number;
  goalId: null,
  title: string;
  status: string;
  objectiveTemplateId: null | number;
  onAR: boolean;
  onApprovedAR: boolean;
  createdVia: 'activityReport';
  firstNotStartedAt: string | null;
  lastNotStartedAt: string | null;
  firstInProgressAt: string | null;
  lastInProgressAt: string | null;
  firstSuspendedAt: string | null;
  lastSuspendedAt: string | null;
  firstCompleteAt: string | null;
  lastCompleteAt: string | null;
  rtrOrder: number;
  closeSuspendReason: string | null;
  closeSuspendContext: string | null;
  mapsToParentObjectiveId: null | number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  courses?: ICourse[];
  resources?: IResource[];
  topics?: ITopic[];
  files?: IFile[];
}

interface IOtherEntityObjectiveModelInstance extends IOtherEntityObjective {
  dataValues: IOtherEntityObjective,
  toJSON: () => IOtherEntityObjective,
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
  ICitation,
  // -- model version of the above -- //
  IGoalModelInstance,
  IGrantModelInstance,
  ICourseModelInstance,
  ITopicModelInstance,
  IResourceModelInstance,
  IFileModelInstance,
  IObjectiveModelInstance,
  IActivityReportObjectivesModelInstance,
  ICitationModelInstance,
  // -- after going through reduceGoals -- //
  IReducedObjective,
  IReducedGoal,
  // -- other entity objective -- //
  IOtherEntityObjective,
  IOtherEntityObjectiveModelInstance,
  IReviewPrompt,
};
