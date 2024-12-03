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
  activityReportIds: string[];
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
  type: string;
  category: string;
  correctionDeadline: string;
  objectives: ITTAByReviewObjective[];
}

interface ITTAByReviewResponse {
  name: string;
  reviewType: string;
  reviewReceived: string;
  findings: ITTAByReviewFinding[];
  grants: string[];
  outcome: string;
  lastTTADate: string | null;
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
