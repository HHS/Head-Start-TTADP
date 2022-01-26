import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { logger } from '../logger';

/**
 * put it in this object so we could add to this as necessary
 */
const TOPIC_DICTIONARY = [
  {
    old: 'Behavioral / Mental Health',
    new: 'Behavioral / Mental Health / Trauma',
  },
  {
    old: 'QIP',
    new: 'Quality Improvement Plan / QIP',
  },
  {
    old: 'CLASS: Classroom Management',
    new: 'CLASS: Classroom Organization',
  },
  {
    old: 'Curriculum (Early Childhood or Parenting)',
    new: 'Curriculum (Instructional or Parenting)',
  },
  {
    old: 'Environmental Health and Safety',
    new: 'Environmental Health and Safety / EPRR',

  },
  {
    old: 'Behavioral / Mental Health | HS',
    new: 'Behavioral / Mental Health / Trauma',
  },
  {
    old: 'Behavioral / Mental Health | HS, FES',
    new: 'Behavioral / Mental Health / Trauma',
  },
  {
    old: 'Child Assessment, Development, Screening | ECS',
    new: 'Child Assessment, Development, Screening',

  },
  {
    old: 'Curriculum/a  (Instructional or Parenting) | ECS, FES',
    new: 'Curriculum (Instructional or Parenting)',

  },
  {
    old: 'Curriculum (Early Chidhood or Parenting)', // missing l in child
    new: 'Curriculum (Instructional or Parenting)',

  },
  {
    old: 'Eligibility (ERSEA) | ECS, FES, GS',
    new: 'ERSEA',

  },
  {
    old: 'Environmental Health and Safety | HS',
    new: 'Environmental Health and Safety / EPRR',
  },
  {
    old: 'Facilities | GS',
    new: 'Facilities',
  },
  {
    old: 'Family Support Services | FES',
    new: 'Family Support Services',
  },
  {
    old: 'Fiscal / Budget | GS',
    new: 'Fiscal / Budget',
  },
  {
    old: 'Human Resources | GS',
    new: 'Human Resources',
  },
  {
    old: 'Leadership / Governance | GS',
    new: 'Leadership / Governance',
  },
  {
    old: 'Leadership / Governance | GS, FES',
    new: 'Leadership / Governance',
  },
  {
    old: 'Nutrition | HS',
    new: 'Nutrition',
  },
  {
    old: 'Oral Health | HS',
    new: 'Oral Health',
  },
  {
    old: 'Parent and Family Engagement | ECS, FES, HS',
    new: 'Parent and Family Engagement',
  },
  {
    old: 'Partnerships and Community Engagement | ECS, FES, SS',
    new: 'Partnerships and Community Engagement',
  },
  {
    old: 'Physical Health and Screenings | HS',
    new: 'Physical Health and Screenings',
  },
  {
    old: 'Pregnancy | FES, HS',
    new: 'Pregnancy Services / Expectant Families',
  },
  {
    old: 'Program Planning, Operations, Management Systems | GS',
    new: 'Program Planning and Services',
  },
  {
    old: 'Quality Improvement / QIP | GS',
    new: 'Quality Improvement / QIP',
  },
  {
    old: 'Safety Practices | HS',
    new: 'Safety Practices',
  },
  {
    old: 'Transition Practices | ECS',
    new: 'Transition Practices',
  },
  {
    old: 'Transition Practices | ECS, FES',
    new: 'Transition Practices',
  },
  {
    old: 'Transportation | GS',
    new: 'Transportation',
  },
  {
    old: 'parent/family engagement/program planning/QIP',
    new: ['Parent and Family Engagement', 'Program Planning and Services', 'Quality Improvement / QIP'],
  },
];

export default async function updateTopicNames() {
  // we find any activity reports that have ANY of the old topics in their topics field
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'topics'],
    where: {
      topics: {
        [Op.overlap]: TOPIC_DICTIONARY.map((dict) => dict.old),
      },
    },
  });

  logger.info(`updateTopicNames: ${reports.length} reports with out of date topics found and updated`);

  // this will hold an array of promises which I
  // frankly am only using to get the unit test timing to work out
  const promises = [];

  // loop through the found reports
  reports.forEach(async (report) => {
    // copy existing state
    let topics = [...report.topics];

    // within each report, check our array of topics to rename
    TOPIC_DICTIONARY.forEach((topic) => {
      // find the index of the old topic, if it exists
      const index = topics.indexOf(topic.old);

      // -1 if it doesn't exist
      if (index !== -1) {
        logger.info(`Renaming ${topic.old} to ${topic.new} in ${report.id}`);
        // mutate our copy
        if (Array.isArray(topic.new)) {
          topics.splice(index, 1);
          topics = topics.concat(topic.new);
        } else {
          topics.splice(index, 1, topic.new);
        }
      }
    });

    // push our update operation to our promises array
    promises.push(report.update({ topics }));
  });

  // return our updates as an array of promises
  // (will return an array of updated Activity Report objects)
  return Promise.all(promises);
}
