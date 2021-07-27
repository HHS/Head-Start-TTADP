import { Op } from 'sequelize';
import {
  ActivityReport,
} from '../models';
import { REPORT_STATUSES } from '../constants';

// copied from /frontend/src/pages/ActivityReports/constants.js
export const topics = [
  'Behavioral / Mental Health / Trauma',
  'Child Assessment, Development, Screening',
  'CLASS: Classroom Organization',
  'CLASS: Emotional Support',
  'CLASS: Instructional Support',
  'Coaching',
  'Communication',
  'Community and Self-Assessment',
  'Culture & Language',
  'Curriculum (Instructional or Parenting)',
  'Data and Evaluation',
  'ERSEA',
  'Environmental Health and Safety / EPRR',
  'Equity',
  'Facilities',
  'Family Support Services',
  'Fiscal / Budget',
  'Five-Year Grant',
  'Home Visiting',
  'Human Resources',
  'Leadership / Governance',
  'Learning Environments',
  'Nutrition',
  'Oral Health',
  'Parent and Family Engagement',
  'Partnerships and Community Engagement',
  'Physical Health and Screenings',
  'Pregnancy Services / Expectant Families',
  'Program Planning and Services',
  'Quality Improvement Plan / QIP',
  'Recordkeeping and Reporting',
  'Safety Practices',
  'Staff Wellness',
  'Teaching Practices / Teacher-Child Interactions',
  'Technology and Information Systems',
  'Transition Practices',
  'Transportation',
];

export default async function topicFrequencyGraph(scopes) {
  const topicsAndParticipants = await ActivityReport.findAll({
    attributes: [
      'topics',
      'participants',
    ],
    where: {
      [Op.and]: [scopes],
      status: REPORT_STATUSES.APPROVED,

    },
    raw: true,
    includeIgnoreAttributes: false,
  });

  const reasons = topics.map((topic) => ({
    reason: topic,
    count: 0,
    participants: [],
  }));

  topicsAndParticipants.forEach((topicAndParticipant) => {
    topicAndParticipant.topics.forEach((topic) => {
      // filter our array for our 1 matching reason
      const selectedReason = reasons.find((reason) => reason.reason === topic);

      // assuming it's a reason we know what to do with
      if (selectedReason) {
        // increment the count
        selectedReason.count += 1;

        // add that reason to the participants
        selectedReason.participants = [...selectedReason.participants,
          ...topicAndParticipant.participants];

        // remove dupes from the participants
        selectedReason.participants = Array.from(new Set(selectedReason.participants));
      }
    });
  });

  return reasons;
}
