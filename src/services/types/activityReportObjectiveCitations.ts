import { ITTAByReviewObjective } from './monitoring';

export interface ActivityReportObjectiveCitationResponse extends ITTAByReviewObjective {
  findingIds: string[];
  reviewNames: string[];
  grantNumber: string;
}

export interface ActivityReportObjectiveCitation {
  findingIds: string[];
  grantNumber: string;
  reviewNames: string[];
  id: number;
  activityReportObjectiveId: number;
  citation: string;
  monitoringReferences: MonitoringReference[];
  createdAt: Date;
  updatedAt: Date;
  activityReportObjective: ActivityReportObjective;
}

export interface ActivityReportObjective {
  id: number;
  activityReportId: number;
  objectiveId: number;
  arOrder: number;
  closeSuspendReason: null;
  closeSuspendContext: null;
  title: string;
  status: string;
  ttaProvided: string;
  supportType: string;
  objectiveCreatedHere: boolean;
  originalObjectiveId: null;
  createdAt: Date;
  updatedAt: Date;
  activityReportObjectiveTopics: ActivityReportObjectiveTopic[];
  activityReport: ActivityReport;
  objective: Objective;
}

export interface ActivityReport {
  displayId: string;
  endDate: string;
  startDate: string;
  submittedDate: null;
  lastSaved: string;
  creatorNameWithRole: string;
  creatorName: string;
  id: number;
  legacyId: null;
  userId: number;
  lastUpdatedById: number;
  additionalNotes: null;
  numberOfParticipants: number;
  deliveryMethod: string;
  version: number;
  duration: string;
  activityRecipientType: string;
  requester: string;
  targetPopulations: string[];
  language: string[];
  virtualDeliveryType: null;
  reason: string[];
  participants: string[];
  programTypes: null;
  context: string;
  pageState: { [key: string]: string };
  regionId: number;
  submissionStatus: string;
  calculatedStatus: string;
  ttaType: string[];
  updatedAt: Date;
  approvedAt: null;
  imported: null;
  creatorRole: string;
  createdAt: Date;
}

export interface ActivityReportObjectiveTopic {
  id: number;
  activityReportObjectiveId: number;
  topicId: number;
  createdAt: Date;
  updatedAt: Date;
  topic: Topic;
}

export interface Topic {
  name: string;
}

export interface Objective {
  id: number;
  otherEntityId: null;
  goalId: number;
  title: string;
  status: string;
  objectiveTemplateId: null;
  onAR: boolean;
  onApprovedAR: boolean;
  createdVia: string;
  firstNotStartedAt: Date;
  lastNotStartedAt: Date;
  firstInProgressAt: null;
  lastInProgressAt: null;
  firstSuspendedAt: null;
  lastSuspendedAt: null;
  firstCompleteAt: null;
  lastCompleteAt: null;
  rtrOrder: number;
  closeSuspendReason: null;
  closeSuspendContext: null;
  mapsToParentObjectiveId: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  goal: Goal;
}

export interface Goal {
  endDate: string;
  goalNumber: string;
  isCurated: boolean;
  isSourceEditable: boolean;
  id: number;
  name: string;
  status: string;
  timeframe: null;
  isFromSmartsheetTtaPlan: boolean;
  grantId: number;
  goalTemplateId: number;
  mapsToParentGoalId: null;
  onAR: boolean;
  onApprovedAR: boolean;
  isRttapa: string;
  createdVia: string;
  rtrOrder: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  goalCollaborators: GoalCollaborator[];
}

export interface CollaboratorType {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

export interface GoalCollaborator {
  id: number;
  goalId: number;
  userId: number;
  collaboratorTypeId: number;
  linkBack: LinkBack;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  user: User;
  collaboratorTypes: CollaboratorType[];
}

export interface LinkBack {
  activityReportIds: number[];
}

export interface User {
  fullName: string;
  nameWithNationalCenters: string;
  id: number;
  homeRegionId: number;
  hsesUserId: string;
  hsesUsername: string;
  hsesAuthorities: string[];
  name: string;
  phoneNumber: null;
  email: string;
  flags: string[];
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonitoringReference {
  acro: string;
  name: string;
  grantId: number;
  citation: string;
  severity: number;
  findingId: string;
  reviewName: string;
  standardId: number;
  findingType: string;
  grantNumber: string;
  findingSource: string;
  reportDeliveryDate: Date;
  monitoringFindingStatusName: string;
}
