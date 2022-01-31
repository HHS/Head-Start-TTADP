import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { auditLogger } from '../logger';

export default async function updateDeliveryData() {
  auditLogger.info(`Updating delivery method...
  
  `);

  const reports = await ActivityReport.findAll({
    attributes: ['id', 'deliveryMethod', 'virtualDeliveryType', 'imported'],
    where: {
      [Op.and]: [
        {
          // only select legacy reports
          imported: {
            [Op.not]: null,
          },
        },
        {
          [Op.or]: [
            {
              deliveryMethod: {
                [Op.iLike]: '%Email%',
              },
            },
            {
              deliveryMethod: {
                [Op.iLike]: '%Multi-grantee: Recurring event (Community Practice)%',
              },
            },
            {
              deliveryMethod: {
                [Op.iLike]: '%Multi-grantee: Single event (Cluster)%',
              },
            },
            {
              deliveryMethod: {
                [Op.iLike]: '%Telephone%',
              },
            },
          ],
        },
      ],
    },
  });

  auditLogger.info(`${reports.length ? reports.length : 0} reports with affected data found...
  
  `);

  return Promise.all(reports.map(async (report) => {
    let { deliveryMethod, virtualDeliveryType } = report;

    if (deliveryMethod.search(/virtual/i) !== -1 && deliveryMethod.search(/telephone/i) === -1) {
      deliveryMethod = 'Virtual';
    }

    if (deliveryMethod.search(/email/i) !== -1 && deliveryMethod.search(/telephone/i) === -1) {
      deliveryMethod = 'Virtual';
    }

    if (deliveryMethod.search(/telephone/i) !== -1) {
      deliveryMethod = 'Virtual';
      virtualDeliveryType = 'Telephone';
    }

    if (deliveryMethod.search(/virtual/i) !== -1 && deliveryMethod.search(/virtual/i) !== -1) {
      deliveryMethod = 'Virtual';
      virtualDeliveryType = 'Telephone';
    }

    if (deliveryMethod.search(/Multi-grantee: Recurring event (Community Practice)/i) !== -1 && deliveryMethod.search(/virtual/i) === -1) {
      deliveryMethod = '';
      virtualDeliveryType = '';
    }

    console.log(`changing deliverymethod: ${report.deliveryMethod} to ${deliveryMethod}`);
    console.log(`changing deliverytype: ${report.virtualDeliveryType} to ${virtualDeliveryType}`);
    // return report.update({
    //   deliveryMethod,
    //   virtualDeliveryType,
    // });
  }));
}
