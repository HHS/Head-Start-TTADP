export interface IMonitoringReview {
  reportDeliveryDate: Date
  id: number
  reviewType: string
  statusLink: {
    status: {
      name: string
    }
  }
}

export interface IMonitoringReviewGrantee {
  id: number
  grantId: number
  reviewId: number
  monitoringReviewLink: {
    monitoringReviews: IMonitoringReview[]
  }
}

export interface IMonitoringResponse {
  recipientId: number
  regionId: number
  reviewStatus: string
  reviewDate: string
  reviewType: string
  grant: string
}

export interface ITTAByReviewObjective {
  title: string
  activityReports: {
    id: number
    displayId: string
  }[]
  endDate: string
  topics: string[]
  status: string
}

export interface ITTAByCitationReview {
  name: string
  reviewType: string
  reviewReceived: string
  outcome: string
  findingStatus: string
  specialists: {
    name: string
    roles: string[]
  }[]
  objectives: ITTAByReviewObjective[]
}

export interface ITTAByReviewFinding {
  citation: string
  status: string
  findingType: string
  category: string
  correctionDeadline: string
  objectives: ITTAByReviewObjective[]
}

export interface ITTAByReviewResponse {
  id: number
  name: string
  reviewType: string
  reviewReceived: string
  findings: ITTAByReviewFinding[]
  grants: string[]
  outcome: string
  lastTTADate: string | null // need ars
  specialists: {
    name: string
    roles: string[]
  }[]
}

export interface ITTAByCitationResponse {
  citationNumber: string
  findingType: string
  status: string
  category: string
  grantNumbers: string[]
  lastTTADate: string | null
  reviews: ITTAByCitationReview[]
}
