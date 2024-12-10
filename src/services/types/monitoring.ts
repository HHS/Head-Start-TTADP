interface IMonitoringReview {
  reportDeliveryDate: Date;
  id: number;
  reviewType: string;
  statusLink: {
    status: {
      name: string;
    }
  };
}

interface IMonitoringReviewGrantee {
  id: number;
  grantId: number;
  reviewId: number;
  monitoringReviewLink: {
    monitoringReviews: IMonitoringReview[];
  }
}

interface IMonitoringResponse {
  recipientId: number;
  regionId: number;
  reviewStatus: string;
  reviewDate: string;
  reviewType: string;
  grant: string;
}

interface ITTAByReviewObjective {
  title: string;
  activityReports: {
    id: number;
    displayId: string;
  }[];
  endDate: string;
  topics: string[];
  status: string;
}

interface ITTAByCitationReview {
  name: string;
  reviewType: string;
  reviewReceived: string;
  outcome: string;
  findingStatus: string;
  specialists: {
    name: string;
    roles: string[];
  }[];
  objectives: ITTAByReviewObjective[];
}

interface ITTAByReviewFinding {
  citation: string;
  status: string;
  findingType: string;
  category: string;
  correctionDeadline: string;
  objectives: ITTAByReviewObjective[];
}

interface ITTAByReviewResponse {
  id: number;
  name: string;
  reviewType: string;
  reviewReceived: string;
  findings: ITTAByReviewFinding[];
  grants: string[];
  outcome: string;
  lastTTADate: string | null; // need ars
  specialists: {
    name: string;
    roles: string[];
  }[];
}

interface ITTAByCitationResponse {
  citationNumber: string;
  findingType: string;
  status: string;
  category: string;
  grantNumbers: string[];
  lastTTADate: string | null;
  reviews: ITTAByCitationReview[];
}

export interface MonitoringStandard {
  id: number;
  standardId: number;
  contentId: string;
  citation: string;
  text: string;
  guidance: string;
  citable: number;
  hash: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  standardLink: StandardLink;
}

export interface StandardLink {
  id: number;
  standardId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringFindingStandards: MonitoringFindingStandard[];
  monitoringStandards: MonitoringStandard[];
}

export interface MonitoringFindingStandard {
  id: number;
  findingId: string;
  standardId: number;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  findingLink: FindingLink;
  standardLink: StandardLink;
}

export interface FindingLink {
  id: number;
  findingId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringFindingHistories: MonitoringFindingHistory[];
  monitoringFindings: MonitoringFinding[];
}

export interface MonitoringFindingHistory {
  id: number;
  reviewId: string;
  findingHistoryId: string;
  findingId: string;
  statusId: number;
  narrative: string;
  ordinal: number;
  determination: null | string;
  hash: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviewLink: MonitoringReviewLink;
  // monitoringFindingLink: MonitoringFindingLink;
}

export interface MonitoringReviewLink {
  id: number;
  reviewId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviews: MonitoringReview[];
  monitoringReviewGrantees: MonitoringReviewGrantee[];
  monitoringFindingHistories?: MonitoringFindingHistory[];
}

export interface MonitoringReviewGrantee {
  id: number;
  reviewId: string;
  granteeId: string;
  createTime: Date;
  updateTime: Date;
  updateBy: string;
  grantNumber: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

export interface MonitoringFinding {
  id: number;
  findingId: string;
  statusId: number;
  findingType: string;
  source: string;
  correctionDeadLine: Date;
  reportedDate: Date;
  closedDate: Date;
  hash: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  statusLink: StatusLink;
}

export interface StatusLink {
  id: number;
  statusId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringFindingStatuses: MonitoringFindingStatus[];
}

export interface MonitoringFindingStatus {
  id: number;
  statusId: number;
  name: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

export interface MonitoringReview {
  id: number;
  reviewId: string;
  contentId: string;
  statusId: number;
  name: string;
  startDate: Date;
  endDate: Date;
  reviewType: string;
  reportDeliveryDate: Date;
  reportAttachmentId: string;
  outcome: string;
  hash: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviewLink: MonitoringReviewLink;
}

export interface MonitoringFindingLink {
  id: number;
  findingId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringFindingStandards: MonitoringFindingStandard[];
  monitoringFindings: MonitoringFinding[];
}

export {
  IMonitoringReview,
  IMonitoringReviewGrantee,
  IMonitoringResponse,
  ITTAByReviewObjective,
  ITTAByCitationReview,
  ITTAByReviewFinding,
  ITTAByReviewResponse,
  ITTAByCitationResponse,
};
