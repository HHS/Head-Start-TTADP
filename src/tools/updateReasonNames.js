import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { logger } from '../logger';

/**
 * put it in this object so we could add to this as necessary
 */
const REASON_DICTIONARY = [
  {
    old: 'Monitoring | Under Enrollment',
    renamed: 'Full Enrollment',
  },
  {
    old: 'Need: Data Training or Analysis',
    renamed: 'Ongoing Quality Improvement',
  },
  {
    old: 'Need: Professional Development',
    renamed: 'Ongoing Quality Improvement',
  },
  {
    old: 'Need: Quality Improvement Support',
    renamed: 'Ongoing Quality Improvement',
  },
  {
    old: 'Professional Development',
    renamed: 'Ongoing Quality Improvement',
  },
  {
    old: 'Need: Program Planning',
    renamed: 'Planning/Coordination (also TTA Plan Agreement)',
  },
  {
    old: 'Need: School Readiness',
    renamed: 'School Readiness Goals',
  },
];

async function updateReasons(report, reasons, isLegacy) {
  let updatedReport = false;
  REASON_DICTIONARY.forEach((reason) => {
    // find the index of the old reason, if it exists
    const index = reasons.indexOf(reason.old);

    const legacyLabel = isLegacy ? 'LEGACY ' : '';

    // -1 if it doesn't exist
    if (index !== -1) {
      // Check if we already have this reason rename.
      if (reasons.includes(reason.renamed)) {
        logger.info(`Removing ${reason.old} the  ${legacyLabel}reason ${reason.renamed} was already in ${report.id}`);
        // Just remove the old name.
        reasons.splice(index, 1);
      } else {
        logger.info(`Renaming ${legacyLabel}Reason  ${reason.old} to ${reason.renamed} in ${report.id}`);
        // mutate our copy
        reasons.splice(index, 1, reason.renamed);
      }
      updatedReport = true;
    }
  });

  // Only save the report if we have changed something.
  if (updatedReport) {
    if (isLegacy) {
      const legacyImported = report.imported;
      legacyImported.reasons = reasons.join('\n');
      await report.update({ imported: legacyImported });
    } else {
      await report.update({ reason: reasons });
    }
  }
}

export default async function updateReasonNames() {
  // get all legacy reason reports.
  const legacyReasonReports = await ActivityReport.unscoped().findAll({
    where: {
      [Op.and]: [
        { legacyId: { [Op.ne]: null } },
        {
          imported: {
            reasons: {
              [Op.ne]: '',
            },
          },
        },
      ],
    },
  });

  // loop and update legacy report reasons.
  legacyReasonReports.forEach((legacyReport) => {
    const legacyReasons = legacyReport.imported.reasons.split(
      '\n',
    );

    // Update legacy reasons.
    updateReasons(legacyReport, legacyReasons, true);
  });

  // Find reports that have a reason we need to update (unscoped).
  const reports = await ActivityReport.unscoped().findAll({
    where: {
      reason: {
        [Op.overlap]: REASON_DICTIONARY.map((dict) => dict.old),
      },
    },
  });

  // Loop through the found reports.
  reports.forEach((report) => {
    // Get report reasons.
    const reasons = [...report.reason];

    // Update reasons.
    updateReasons(report, reasons, false);
  });
}
