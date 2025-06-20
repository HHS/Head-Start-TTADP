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
  monitoringReviewLink: MonitoringReviewLink;
}

export interface MonitoringReviewLink {
  id: number;
  reviewId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringReviewGrantees: MonitoringReviewGrantee[];
  monitoringFindingHistories: MonitoringFindingHistory[];
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
  monitoringFindingLink: MonitoringFindingLink;
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
  standardLink: StandardLink;
}

export interface StandardLink {
  id: number;
  standardId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  monitoringStandards: MonitoringStandard[];
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
}

export interface MonitoringFinding {
  id: number;
  findingId: string;
  statusId: number;
  findingType: string;
  source: string;
  correctionDeadLine: null;
  reportedDate: Date;
  closedDate: null;
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
  monitoringFindingStatuses?: MonitoringStatus[];
  monitoringReviewStatuses?: MonitoringStatus[];
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
