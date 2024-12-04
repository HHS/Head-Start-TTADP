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
  citation: string; // ??
  status: string; // check
  findingType: string; // check
  category: string; // check
  correctionDeadline: string; // check
  objectives: ITTAByReviewObjective[];
}

interface ITTAByReviewResponse {
  id: number; // check
  name: string; // check
  reviewType: string; // check
  reviewReceived: string;
  findings: ITTAByReviewFinding[];
  grants: string[]; // check
  outcome: string; // check
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

interface ITTAByReviewsSequelizeQueryResponse {
  id: number;
  reviewId: string;
  reportDeliveryDate: string;
  contentId: string;
  name: string;
  outcome: string;
  reviewType: string;
  monitoringReviewLink: {
    monitoringFindingHistories: {
      narrative: string;
      ordinal: number;
      determination: string;
      monitoringFindingLink?: {
        monitoringFindings: {
          citationNumber: string;
          findingType: string;
          source: string;
          correctionDeadLine: string;
          statusLink: {
            monitoringFindingStatuses: {
              name: string;
            }[];
          };
        }[];
      };
    }[];
    monitoringReviewGrantees: {
      grantNumber: string;
    }[];
  };

  toJSON: () => Omit<ITTAByReviewsSequelizeQueryResponse, 'toJSON'>;
}

export {
  IMonitoringReview,
  IMonitoringReviewGrantee,
  IMonitoringResponse,
  ITTAByReviewObjective,
  ITTAByCitationReview,
  ITTAByReviewFinding,
  ITTAByReviewResponse,
  ITTAByReviewsSequelizeQueryResponse,
  ITTAByCitationResponse,
};
