import { auditLogger } from "../logger";
import { Op } from "sequelize";
import { ActivityReport, ActivityRecipient, NonGrantee } from "../models";

const hubNonGrantees = {
  HSCO: "Head Start Collaboration Office",
  "Local/State Education System": "State Education System",
  "State Early Learning System / Guidelines": "State Early Learning Standards",
  "State Advisory Council": "QRIS System",
  "Regional TTA Team / Specialists": "Regional TTA/Other Specialists",
  "State Early Learning Standards / Guidelines":
    "State Early Learning Standards",
};

const populateLegacyNonGrantees = async () => {
  const nonGranteeReports = await ActivityReport.findAll({
    where: {
      [Op.and]: [
        { legacyId: { [Op.ne]: null } },
        {
          imported: {
            nonGranteeActivity: {
              [Op.ne]: "",
            },
          },
        },
      ],
    },
  });

  for await (const nonGranteeReport of nonGranteeReports) {
    const nonGranteeArray = nonGranteeReport.imported.nonGranteeActivity.split(
      "\n"
    );
    for await (const nonGranteeName of nonGranteeArray) {
      const translatedNonGranteeName =
        hubNonGrantees[nonGranteeName] || nonGranteeName;
      const nonGrantee = await NonGrantee.findOne({
        where: { name: translatedNonGranteeName },
      });
      if (nonGrantee) {
        auditLogger.info(
          `Processing non-grantee ${nonGrantee.id} for activity report ${nonGranteeReport.id}`
        );
        await ActivityRecipient.findOrCreate({
          where: {
            activityReportId: nonGranteeReport.id,
            nonGranteeId: nonGrantee.id,
          },
        });
      }
    }
  }
};

export default populateLegacyNonGrantees;
