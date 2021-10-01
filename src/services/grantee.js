import { Op } from 'sequelize';
import {
  Grant, Grantee, ActivityReport, ActivityRecipient,
} from '../models';

export async function allGrantees() {
  return Grantee.findAll({
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
      },
    ],
  });
}

export async function granteeByScopes(granteeId, grantScopes) {
  const grantee = await Grantee.findOne({
    attributes: ['id', 'name'],
    where: {
      id: granteeId,
    },
    include: [
      {
        attributes: ['id'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: [
            grantScopes,
          ],
        },
      },
    ],
  });

  if (!grantee) {
    return null;
  }

  if (grantee.grants.length < 1) {
    return {
      name: grantee.name,
      grants: [],
    };
  }

  const grantIds = [...new Set(grantee.grants.map((grant) => grant.id))];

  const recipients = await ActivityRecipient.findAll({
    attributes: ['grantId'],
    include: [
      {
        model: Grant,
        attributes: ['id', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        as: 'grant',
        where: {
          id: grantIds,
        },
      },
      {
        model: ActivityReport,
        attributes: ['programTypes'],
        as: 'ActivityReport',
      },
    ],
  });

  const grants = new Map();
  recipients.forEach((recipient) => {
    if (grants.has(recipient.grantId)) {
      const grant = grants.get(recipient.grantId);
      const programTypes = Array.from(
        new Set(
          [...recipient.ActivityReport.programTypes, ...grant.programTypes],
        ),
      );
      grants.set(recipient.grantId, { ...grant, programTypes });
    } else {
      const {
        id,
        number,
        regionId,
        status,
        startDate,
        endDate,
        programSpecialistName,
      } = recipient.grant;

      const grant = {
        id,
        number,
        regionId,
        status,
        startDate,
        endDate,
        programSpecialistName,
        programTypes: recipient.ActivityReport.programTypes,
      };

      grants.set(recipient.grantId, grant);
    }
  });

  return {
    name: grantee.name,
    grants: Array.from(grants.values()),
  };
}
