import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { logger } from '../logger';

/**
 * put it in this object so we could add to this as necessary
 */
const TOPIC_DICTIONARY = [
  {
    old: 'Behavioral / Mental Health',
    renamed: 'Behavioral / Mental Health / Trauma',
  },
  {
    old: 'QIP',
    renamed: 'Quality Improvement Plan / QIP',
  },
  {
    old: 'CLASS: Classroom Management',
    renamed: 'CLASS: Classroom Organization',
  },
  {
    old: 'Curriculum: Early Childhood or Parenting',
    renamed: 'Curriculum (Instructional or Parenting)',
  },
  {
    old: 'Environmental Health and Safety',
    renamed: 'Environmental Health and Safety / EPRR',
  },
];

export default async function updateTopicNames() {
  // we find any activity reports that have ANY of the old topics in their topics field
  const reports = await ActivityReport.findAll({
    where: {
      topics: {
        [Op.overlap]: TOPIC_DICTIONARY.map((dict) => dict.old),
      },
    },
  });

  // this will hold an array of promises which I
  // frankly am only using to get the unit test timing to work out
  const promises = [];

  // loop through the found reports
  reports.forEach(async (report) => {
    // copy existing state
    const topics = [...report.topics];

    // within each report, check our array of topics to rename
    TOPIC_DICTIONARY.forEach((topic) => {
      // find the index of the old topic, if it exists
      const index = topics.indexOf(topic.old);

      // -1 if it doesn't exist (Thanks Javascript)
      if (index !== -1) {
        logger.info(`Renaming ${topic.old} to ${topic.renamed} in ${report.id}`);
        // mutate our copy
        topics.splice(index, 1, topic.renamed);
      }
    });

    // push our update operation to our promises array
    promises.push(report.update({ topics }));
  });

  // return our updates as an array of promises
  // (will return an array of updated Activity Report objects)
  return Promise.all(promises);
}
