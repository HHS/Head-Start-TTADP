import moment from 'moment';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
  MonitoringClassSummary,
} = db;

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

export async function ttaByReviews(
  _recipientId: number,
  _regionId: number,
): Promise<ITTAByReviewResponse[]> {
  return [
    {
      name: '241234FU',
      reviewType: 'Follow-up',
      reviewReceived: '01/01/2021',
      outcome: 'Compliant',
      lastTTADate: null,
      specialists: [],
      grants: [
        '14CH123456',
        '14HP141234',
      ],
      findings: [
        {
          citation: '1392.47(b)(5)(i)',
          status: 'Corrected',
          type: 'Noncompliance',
          category: 'Monitoring and Implementing Quality Health Services',
          correctionDeadline: '09/18/2024',
          objectives: [],
        },
        {
          citation: '1302.91(a)',
          status: 'Corrected',
          type: 'Noncompliance',
          category: 'Program Management and Quality Improvement',
          correctionDeadline: '09/18/2024',
          objectives: [],
        },
        {
          citation: '1302.12(m)',
          status: 'Corrected',
          type: 'Noncompliance',
          category: 'Program Management and Quality Improvement',
          correctionDeadline: '09/18/2024',
          objectives: [],
        },
      ],
    },
    {
      name: '241234RAN',
      reviewType: 'RAN',
      reviewReceived: '06/21/2024',
      outcome: 'Deficiency',
      lastTTADate: '07/12/2024',
      grants: [
        '14CH123456',
        '14HP141234',
      ],
      specialists: [
        {
          name: 'Specialist 1',
          roles: ['GS'],
        },
      ],
      findings: [
        {
          citation: '1302.47(b)(5)(iv)',
          status: 'Active',
          type: 'Deficiency',
          category: 'Inappropriate Release',
          correctionDeadline: '07/25/2024',
          objectives: [
            {
              title: 'The TTA Specialist will assist the recipient with developing a QIP and/or corrective action plan to address the finding with correction strategies, timeframes, and evidence of the correction.',
              activityReportIds: ['14AR29888'],
              endDate: '07/12/2024',
              topics: ['Communication', 'Quality Improvement Plan/QIP', 'Safety Practices', 'Transportation'],
              status: 'In Progress',
            },
          ],
        },
      ],
    },
    {
      name: '241234F2',
      reviewType: 'FA-2',
      reviewReceived: '05/20/2024',
      outcome: 'Noncompliant',
      lastTTADate: '03/27/2024',
      grants: [
        '14CH123456',
        '14HP141234',
      ],
      specialists: [
        {
          name: 'Specialist 1',
          roles: ['GS'],
        },
        {
          name: 'Specialist 1',
          roles: ['ECS'],
        },
      ],
      findings: [
        {
          citation: '1302.47(b)(5)(v)',
          status: 'Active',
          type: 'Noncompliance',
          category: 'Monitoring and Implementing Quality Health Services',
          correctionDeadline: '09/18/2024',
          objectives: [
            {
              title: 'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
              activityReportIds: ['14AR12345'],
              endDate: '06/24/2024',
              topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
              status: 'Complete',
            },
          ],
        },
        {
          citation: '1302.91(a)',
          status: 'Active',
          type: 'Noncompliance',
          category: 'Program Management and Quality Improvement',
          correctionDeadline: '09/18/2024',
          objectives: [
            {
              title: 'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
              activityReportIds: ['14AR12345'],
              endDate: '06/24/2024',
              topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
              status: 'Complete',
            },
          ],
        },
        {
          citation: '1302.12(m)',
          status: 'Active',
          type: 'Noncompliance',
          category: 'Program Management and Quality Improvement',
          correctionDeadline: '09/18/2024',
          objectives: [
            {
              title: 'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
              activityReportIds: ['14AR12345'],
              endDate: '06/24/2024',
              topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
              status: 'Complete',
            },
          ],
        },
      ],
    },
  ];
}

export async function ttaByCitations(
  _recipientId: number,
  _regionId: number,
): Promise<ITTAByCitationResponse[]> {
  return [
    {
      citationNumber: '1302.12(m)',
      status: 'Corrected',
      findingType: 'Noncompliance',
      category: 'Program Management and Quality Improvement',
      grantNumbers: [
        '14CH123456',
        '14HP141234',
      ],
      lastTTADate: '06/24/2024',
      reviews: [
        {
          name: '241234FU',
          reviewType: 'Follow-up',
          reviewReceived: '10/17/2024',
          outcome: 'Compliant',
          findingStatus: 'Corrected',
          specialists: [],
          objectives: [],
        },
        {
          name: '241234F2',
          reviewType: 'FA-2',
          reviewReceived: '05/20/2024',
          outcome: 'Noncompliant',
          findingStatus: 'Active',
          specialists: [
            {
              name: 'Specialist 1',
              roles: ['GS'],
            },
            {
              name: 'Specialist 1',
              roles: ['ECS'],
            },
          ],
          objectives: [
            {
              title: 'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
              activityReportIds: ['14AR12345'],
              endDate: '06/24/2024',
              topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
              status: 'Complete',
            },
          ],
        },
      ],
    },
    {
      citationNumber: '1302.47(b)(5)(i)',
      findingType: 'Noncompliance',
      status: 'Corrected',
      category: 'Monitoring and Implementing Quality Health Services',
      grantNumbers: [
        '14CH123456',
        '14HP141234',
      ],
      lastTTADate: '05/22/2022',
      reviews: [
        {
          name: '241234FU',
          reviewType: 'Follow-up',
          reviewReceived: '10/17/2024',
          outcome: 'Noncompliant',
          findingStatus: 'Corrected',
          specialists: [],
          objectives: [],
        },
        {
          name: '241234F2',
          reviewType: 'FA-2',
          reviewReceived: '05/22/2024',
          outcome: 'Noncompliant',
          findingStatus: 'Active',
          specialists: [
            {
              name: 'Specialist 1',
              roles: ['GS'],
            },
            {
              name: 'Specialist 1',
              roles: ['ECS'],
            },
          ],
          objectives: [
            {
              title: 'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
              activityReportIds: ['14AR12345'],
              endDate: '06/24/2024',
              topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
              status: 'Complete',
            },
          ],
        },
      ],
    },
    {
      citationNumber: '1302.47(b)(5)(iv)',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Inappropriate Release',
      grantNumbers: ['14CH123456'],
      lastTTADate: '07/25/2024',
      reviews: [
        {
          name: '241234RAN',
          reviewType: 'RAN',
          reviewReceived: '06/21/2024',
          outcome: 'Deficient',
          findingStatus: 'Active',
          specialists: [
            {
              name: 'Specialist 1',
              roles: ['GS'],
            },
          ],
          objectives: [
            {
              title: 'The TTA Specialist will assist the recipient with developing a QIP and/or corrective action plan to address the finding with correction strategies, timeframes, and evidence of the correction.',
              activityReportIds: ['14AR29888'],
              endDate: '07/12/2024',
              topics: ['Communication', 'Quality Improvement Plan/QIP', 'Safety Practices', 'Transportation'],
              status: 'In Progress',
            },
          ],
        },
      ],
    },
    {
      citationNumber: '1302.91(a)',
      status: 'Corrected',
      findingType: 'Noncompliance',
      category: 'Program Management and Quality Improvement',
      grantNumbers: ['14CH123456', '14HP141234'],
      lastTTADate: '06/24/2024',
      reviews: [
        {
          name: '241234FU',
          reviewType: 'Follow-up',
          reviewReceived: '10/17/2024',
          outcome: 'Compliant',
          findingStatus: 'Corrected',
          specialists: [],
          objectives: [],
        },
        {
          name: '241234F2',
          reviewType: 'FA-2',
          reviewReceived: '05/22/2024',
          outcome: 'Noncompliant',
          findingStatus: 'Active',
          specialists: [
            {
              name: 'Specialist 1',
              roles: ['GS'],
            },
            {
              name: 'Specialist 1',
              roles: ['ECS'],
            },
          ],
          objectives: [
            {
              title: 'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
              activityReportIds: ['14AR12345'],
              endDate: '06/24/2024',
              topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
              status: 'Complete',
            },
          ],
        },
      ],
    },
  ];
}

export async function monitoringData({
  recipientId,
  regionId,
  grantNumber,
}: {
  recipientId: number;
  regionId: number;
  grantNumber: string;
}): Promise<IMonitoringResponse> {
  /**
   *
   *
   * because of the way these tables were linked,
   * we cannot use a findOne here, although it is what we really want
   */
  const grants = await Grant.findAll({
    attributes: ['id', 'recipientId', 'regionId', 'number'],
    where: {
      regionId,
      recipientId,
      number: grantNumber, // since we query by grant number, there can only be one anyways
    },
    include: [
      {
        model: GrantNumberLink,
        as: 'grantNumberLink',
        required: true,
        include: [
          {
            model: MonitoringReviewGrantee,
            attributes: ['id', 'grantNumber', 'reviewId'],
            required: true,
            as: 'monitoringReviewGrantees',
            include: [
              {
                model: MonitoringReviewLink,
                as: 'monitoringReviewLink',
                required: true,
                include: [
                  {
                    model: MonitoringReview,
                    as: 'monitoringReviews',
                    attributes: [
                      'reportDeliveryDate',
                      'id',
                      'reviewType',
                      'reviewId',
                      'statusId',
                      'outcome',
                    ],
                    required: true,
                    include: [
                      {
                        attributes: ['id', 'statusId'],
                        model: MonitoringReviewStatusLink,
                        as: 'statusLink',
                        required: true,
                        include: [
                          {
                            attributes: ['id', 'name', 'statusId'],
                            model: MonitoringReviewStatus,
                            as: 'monitoringReviewStatuses',
                            required: true,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  // get the first grant (remember, there can only be one)
  const grant = (grants[0]?.toJSON() || null);

  if (!grant) {
    // not an error, it's valid for there to be no findings for a grant
    // @ts-ignore
    return null;
  }

  // since all the joins made in the query above are inner joins
  // we can count on the rest of this data being present
  const { monitoringReviewGrantees } = grant.grantNumberLink;

  // get the most recent review
  // - 1) first extract from the join tables
  const monitoringReviews = monitoringReviewGrantees.map(
    (review: IMonitoringReviewGrantee) => review.monitoringReviewLink.monitoringReviews,
  ).flat();

  // - 2) then sort to get the most recent
  const monitoringReview = monitoringReviews.reduce((
    a: IMonitoringReview,
    b: IMonitoringReview,
  ) => {
    if (a.reportDeliveryDate > b.reportDeliveryDate) {
      return a;
    }
    return b;
  }, monitoringReviews[0]);

  // from the most recent review, get the status via the statusLink
  const { monitoringReviewStatuses } = monitoringReview.statusLink;

  // I am presuming there can only be one status linked to a review
  // as that was the structure before tables were refactored
  const [status] = monitoringReviewStatuses;

  return {
    recipientId: grant.recipientId,
    regionId: grant.regionId,
    reviewStatus: monitoringReview.outcome,
    reviewDate: moment(monitoringReview.reportDeliveryDate).format('MM/DD/YYYY'),
    reviewType: monitoringReview.reviewType,
    grant: grant.number,
  };
}

export async function classScore({ recipientId, grantNumber, regionId }: {
  recipientId: number;
  grantNumber: string;
  regionId: number;
}) {
  const score = await MonitoringClassSummary.findOne({
    where: {
      grantNumber,
    },
    attributes: [
      'emotionalSupport',
      'classroomOrganization',
      'instructionalSupport',
      'reportDeliveryDate',
    ],
  }, {
    raw: true,
  });

  if (!score) {
    return {};
  }

  const received = moment(score.reportDeliveryDate);

  // Do not show scores that are before Nov 9, 2020.
  if (received.isBefore('2020-11-09')) {
    return {};
  }

  // Do not show scores for CDI grants.
  const isCDIGrant = await Grant.findOne({
    where: {
      number: grantNumber,
      cdi: true,
    },
  });

  if (isCDIGrant) {
    return {};
  }

  return {
    recipientId,
    regionId,
    grantNumber,
    received: received.format('MM/DD/YYYY'),
    ES: score.emotionalSupport,
    CO: score.classroomOrganization,
    IS: score.instructionalSupport,
  };
}
