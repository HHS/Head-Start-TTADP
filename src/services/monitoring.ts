/* eslint-disable max-len */
import moment from 'moment';
import db from '../models';
import {
  ITTAByReviewResponse,
  IMonitoringReview,
  IMonitoringReviewGrantee,
  IMonitoringResponse,
  ITTAByCitationResponse,
  MonitoringStandard as MonitoringStandardType,
  MonitoringReview as MonitoringReviewType,
} from './types/monitoring';

const {
  Grant,
  GrantNumberLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
  MonitoringClassSummary,
  MonitoringFindingLink,
  MonitoringFindingHistory,
  MonitoringFinding,
  MonitoringFindingStatusLink,
  MonitoringFindingStatus,
  MonitoringFindingStandard,
  MonitoringStandardLink,
  MonitoringStandard,
} = db;

export async function grantNumbersByRecipientAndRegion(recipientId: number, regionId: number) {
  const grants = await Grant.findAll({
    attributes: ['number'],
    where: {
      recipientId,
      regionId,
    },
  }) as { number: string }[];

  return grants.map((grant) => grant.number);
}

export async function ttaByReviews(
  recipientId: number,
  regionId: number,
): Promise<ITTAByReviewResponse[]> {
  const grantNumbers = await grantNumbersByRecipientAndRegion(recipientId, regionId) as string[];
  const reviews = await MonitoringReview.findAll({
    include: [
      {
        model: MonitoringReviewLink,
        as: 'monitoringReviewLink',
        required: true,
        include: [
          {
            model: MonitoringReviewGrantee,
            as: 'monitoringReviewGrantees',
            required: true,
            where: {
              grantNumber: grantNumbers,
            },
          },
          {
            model: MonitoringFindingHistory,
            as: 'monitoringFindingHistories',
            include: [
              {
                model: MonitoringFindingLink,
                as: 'monitoringFindingLink',
                include: [
                  {
                    model: MonitoringFindingStandard,
                    as: 'monitoringFindingStandards',
                    include: [
                      {
                        model: MonitoringStandardLink,
                        as: 'standardLink',
                        include: [
                          {
                            model: MonitoringStandard,
                            as: 'monitoringStandards',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    model: MonitoringFinding,
                    as: 'monitoringFindings',
                    include: [
                      {
                        model: MonitoringFindingStatusLink,
                        as: 'statusLink',
                        include: [
                          {
                            model: MonitoringFindingStatus,
                            as: 'monitoringFindingStatuses',
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
  }) as MonitoringReviewType[];

  const response = reviews.map((review) => {
    const { monitoringReviewGrantees, monitoringFindingHistories } = review.monitoringReviewLink;

    const findings = [];

    monitoringFindingHistories.forEach((history) => {
      if (!history.monitoringFindingLink) {
        return;
      }

      let citation = '';
      const [findingStandards] = history.monitoringFindingLink.monitoringFindingStandards;
      if (findingStandards) {
        const [standard] = findingStandards.standardLink.monitoringStandards;
        citation = standard.citation;
      }

      history.monitoringFindingLink.monitoringFindings.forEach((finding) => {
        const status = finding.statusLink.monitoringFindingStatuses[0].name;
        findings.push({
          citation,
          status,
          findingType: finding.findingType,
          correctionDeadline: moment(finding.correctionDeadLine).format('MM/DD/YYYY'),
          category: finding.source,
          objectives: [],
        });
      });
    });

    return {
      name: review.name,
      id: review.id,
      lastTTADate: null,
      outcome: review.outcome,
      reviewType: review.reviewType,
      reviewReceived: moment(review.reportDeliveryDate).format('MM/DD/YYYY'),
      grants: monitoringReviewGrantees.map((grantee) => grantee.grantNumber),
      specialists: [],
      findings,
    };
  });

  return response;
}

export async function ttaByCitations(
  recipientId: number,
  regionId: number,
): Promise<ITTAByCitationResponse[]> {
  const grantNumbers = await grantNumbersByRecipientAndRegion(recipientId, regionId) as string[];

  const citations = await MonitoringStandard.findAll({
    include: [
      {
        model: MonitoringStandardLink,
        as: 'standardLink',
        required: true,
        include: [
          {
            model: MonitoringFindingStandard,
            as: 'monitoringFindingStandards',
            required: true,
            include: [
              {
                model: MonitoringFindingLink,
                as: 'findingLink',
                required: true,
                include: [
                  {
                    model: MonitoringFindingHistory,
                    as: 'monitoringFindingHistories',
                    required: true,
                    include: [
                      {
                        model: MonitoringReviewLink,
                        as: 'monitoringReviewLink',
                        required: true,
                        include: [
                          {
                            model: MonitoringReview,
                            as: 'monitoringReviews',
                            required: true,
                          },
                          {
                            model: MonitoringReviewGrantee,
                            as: 'monitoringReviewGrantees',
                            required: true,
                            where: {
                              grantNumber: grantNumbers,
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    model: MonitoringFinding,
                    as: 'monitoringFindings',
                    required: true,
                    include: [
                      {
                        model: MonitoringFindingStatusLink,
                        as: 'statusLink',
                        required: true,
                        include: [
                          {
                            model: MonitoringFindingStatus,
                            as: 'monitoringFindingStatuses',
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
  }) as MonitoringStandardType[];

  return citations.map((citation) => {
    const [findingStandard] = citation.standardLink.monitoringFindingStandards;
    const { findingLink } = findingStandard;
    const { monitoringFindings } = findingLink;
    const [finding] = monitoringFindings;

    return {
      citationNumber: citation.citation,
      status: '',
      findingType: '',
      category: finding.source,
      grantNumbers,
      lastTTADate: null,
      reviews: [],
    };
  });

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
