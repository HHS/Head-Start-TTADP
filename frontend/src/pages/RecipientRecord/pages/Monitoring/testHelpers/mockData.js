import { OBJECTIVE_STATUS } from '../../../../../Constants'

const reviewData = [
  {
    name: '241234FU',
    reviewType: 'Follow-up',
    reviewReceived: '01/01/2021',
    outcome: 'Compliant',
    lastTTADate: '',
    specialists: [],
    grants: ['14CH123456', '14HP141234'],
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
    grants: ['14CH123456', '14HP141234'],
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
        findingType: 'Deficiency',
        category: 'Inappropriate Release',
        correctionDeadline: '07/25/2024',
        objectives: [
          {
            title:
              'The TTA Specialist will assist the recipient with developing a QIP and/or corrective action plan to address the finding with correction strategies, timeframes, and evidence of the correction.',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '07/12/2024',
            topics: ['Communication', 'Quality Improvement Plan/QIP', 'Safety Practices', 'Transportation'],
            status: OBJECTIVE_STATUS.IN_PROGRESS,
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
    grants: ['14CH123456', '14HP141234'],
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
        findingType: 'Noncompliance',
        category: 'Monitoring and Implementing Quality Health Services',
        correctionDeadline: '09/18/2024',
        objectives: [
          {
            title:
              'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '06/24/2024',
            topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
      },
      {
        citation: '1302.91(a)',
        status: 'Active',
        findingType: 'Noncompliance',
        category: 'Program Management and Quality Improvement',
        correctionDeadline: '09/18/2024',
        objectives: [
          {
            title:
              'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '06/24/2024',
            topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
      },
      {
        citation: '1302.12(m)',
        status: 'Active',
        findingType: 'Noncompliance',
        category: 'Program Management and Quality Improvement',
        correctionDeadline: '09/18/2024',
        objectives: [
          {
            title:
              'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '06/24/2024',
            topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
      },
    ],
  },
]

const citationData = [
  {
    citationNumber: '1302.12(m)',
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
            title:
              'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '06/24/2024',
            topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
            status: OBJECTIVE_STATUS.COMPLETE,
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
    grantNumbers: ['14CH123456', '14HP141234'],
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
            title:
              'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '06/24/2024',
            topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
            status: OBJECTIVE_STATUS.COMPLETE,
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
            title:
              'The TTA Specialist will assist the recipient with developing a QIP and/or corrective action plan to address the finding with correction strategies, timeframes, and evidence of the correction.',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '07/12/2024',
            topics: ['Communication', 'Quality Improvement Plan/QIP', 'Safety Practices', 'Transportation'],
            status: OBJECTIVE_STATUS.IN_PROGRESS,
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
            title:
              'The TTA Specialist will support the recipient by developing a plan to ensure all staff implement health and safety practices to always keep children safe',
            activityReports: [{ displayId: '14AR12345', id: 12345 }],
            endDate: '06/24/2024',
            topics: ['Human Resources', 'Ongoing Monitoring Management System', 'Safety Practices', 'Training and Profressional Development'],
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
      },
    ],
  },
]

export { reviewData, citationData }
