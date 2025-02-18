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
}

export interface FindingLink {
  id: number;
  findingId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringFindings: MonitoringFinding[];
  monitoringFindingGrants: MonitoringFinding[];
  monitoringFindingHistories: MonitoringFindingHistory[];
}

export interface MonitoringFinding {
  id: number;
  findingId: string;
  granteeId?: string;
  statusId: number;
  findingType: string;
  source: string;
  correctionDeadLine: null;
  reportedDate: Date | null;
  closedDate: null;
  hash: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  statusLink?: StatusLink;
}

export interface StatusLink {
  id: number;
  statusId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviewStatuses?: MonitoringStatus[];
  monitoringFindingStatuses?: MonitoringStatus[];
  monitoringFindingHistoryStatuses?: MonitoringStatus[];
}

export interface MonitoringStatus {
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

export interface MonitoringFindingHistory {
  id: number;
  reviewId: string;
  findingHistoryId: string;
  findingId: string;
  statusId: number;
  narrative: string;
  ordinal: number;
  determination: string;
  hash: string;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  sourceDeletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviewLink: MonitoringReviewLink;
  monitoringFindingStatusLink: StatusLink;
}

export interface MonitoringReviewLink {
  id: number;
  reviewId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviews: MonitoringReview[];
  monitoringReviewGrantees: MonitoringReviewGrantee[];
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
  statusLink: StatusLink;
}
