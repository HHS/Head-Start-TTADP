import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { auditLogger } from '../logger';

const DELIVERY_DICTIONARY = {
  Email: {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: '',
  },
  'Email Multi-grantee: Recurring event (Community Practice) Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: '',
  },
  virutal: {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: '',
  },
  'Multi-grantee: Single event (Cluster) Telephone Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: 'Telephone',
  },
  'Multi-grantee: Recurring event (Community Practice) Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: '',
  },
  'Multi-grantee: Recurring event (Community Practice) Telephone Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: 'Telephone',
  },
  'Multi-grantee: Recurring event (Community Practice) Multi-grantee: Single event (Cluster) Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: '',
  },
  'Multi-grantee: Single event (Cluster)': {
    deliveryMethod: '',
    virtualDeliveryType: '',
  },
  'Email Telephone Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: 'Telephone',
  },
  'Multi-grantee: Recurring event (Community Practice)': {
    deliveryMethod: '',
    virtualDeliveryType: '',
  },
  'Multi-grantee: Single event (Cluster) Virtual': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: 'Telephone',
  },
  'Email Telephone': {
    deliveryMethod: 'Virtual',
    virtualDeliveryType: 'Telephone',
  },
};

export default async function updateDeliveryData() {
  auditLogger.info(`Updating delivery method...
  
  `);

  const deliveryMethods = Object.keys(DELIVERY_DICTIONARY);

  const reports = await ActivityReport.findAll({
    attributes: ['id', 'deliveryMethod', 'virtualDeliveryType', 'imported'],
    where: {
      [Op.and]: [
        {
          deliveryMethod: {
            [Op.or]: deliveryMethods,
          },
        },
      ],
    },
  });

  auditLogger.info(`${reports.length ? reports.length : 0} reports with affected data found...
  
  `);

  return Promise.all(reports.map(async (report) => {
    const entry = DELIVERY_DICTIONARY[report.deliveryMethod];
    const { deliveryMethod, virtualDeliveryType } = entry;

    auditLogger.info(`changing deliverymethod: ${report.deliveryMethod} to ${deliveryMethod}`);
    auditLogger.info(`changing deliverytype: ${report.virtualDeliveryType} to ${virtualDeliveryType}`);

    return report.update({
      deliveryMethod,
      virtualDeliveryType,
    });
  }));
}
