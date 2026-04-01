import { ITTAByReviewObjective } from './monitoring';

export interface ActivityReportObjectiveCitationResponse
  extends ITTAByReviewObjective {
  findingIds: string[];
  reviewNames: string[];
  grantNumber: string;
  specialists: {
    name: string;
    roles: string[];
  }[];
}

export interface Objective {
  id: number;
  title: string;
  status: string;
  activityReportObjectives: ActivityReportObjective[];
}

export interface ActivityReportObjective {
  id: number;
  activityReportId: number;
  objectiveId: number;
  activityReportObjectiveTopics: ActivityReportObjectiveTopic[];
  activityReport: ActivityReport;
  activityReportObjectiveCitations: ActivityReportObjectiveCitation[];
}

export interface ActivityReport {
  displayId: string;
  endDate: string;
  calculatedStatus: string;
  id: number;
  userId: number;
  legacyId: null;
  regionId: number;
  activityReportCollaborators: ActivityReportCollaborator[];
  author: User;
}

export interface ActivityReportCollaborator {
  activityReportId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  user: User;
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
  roles: {
    id: string;
    fullName: string;
    name: string;
  }[];
}

export interface ActivityReportObjectiveCitation {
  findingIds?: string[];
  grantNumber: string | null;
  reviewNames?: string[];
  findingId?: string | null;
  reviewName?: string | null;
  id?: number;
  activityReportObjectiveId?: number;
  citation: string;
  monitoringReferences?: MonitoringReference[] | null;
  createdAt?: Date;
  updatedAt?: Date;
  toJSON?: () => ActivityReportObjectiveCitationJSON;
}

export type ActivityReportObjectiveCitationJSON = Omit<ActivityReportObjectiveCitation, 'toJSON'>;

export interface CitationReferenceEntry {
  acro?: string;
  findingType?: string;
  findingSource?: string;
  standardId?: number | null;
}

export interface CitationReferencePayload {
  citation?: string | null;
  monitoringReferences?: CitationReferenceEntry[] | null;
  acro?: string | null;
  findingType?: string | null;
  findingSource?: string | null;
  standardId?: number | null;
}

export type CitationReferenceJSON =
  Omit<Partial<ActivityReportObjectiveCitationJSON>, 'citation' | 'monitoringReferences'>
  & CitationReferencePayload;

export interface CitationReferenceSerializable extends CitationReferencePayload {
  toJSON?: () => CitationReferenceJSON;
}

export type CitationReferenceTypeField = 'findingType' | 'acro';

export interface CitationReferenceLabel {
  id: number | null;
  label: string;
}

export interface MonitoringReference {
  acro: string;
  name?: string;
  grantId: number;
  citation: string;
  severity: number;
  findingId: string;
  reviewName: string;
  standardId: number | null;
  findingType: string;
  grantNumber: string;
  findingSource: string;
  reportDeliveryDate: Date | string | null;
  monitoringFindingStatusName: string;
}

export interface ActivityReportObjectiveTopic {
  activityReportObjectiveId: number;
  topicId: number;
  topic: Topic;
}

export interface Topic {
  name: string;
}
