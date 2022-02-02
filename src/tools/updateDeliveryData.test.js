import { ActivityReport, sequelize } from '../models';
import { createReport, destroyReport } from '../testUtils';
import updateDeliveryData from './updateDeliveryData';

describe('updateDeliveryData', () => {
  let reports;

  beforeAll(async () => {
    const delivery = [
      // a perfectly healthy report
      {
        deliveryMethod: 'virtual',
        virtualDeliveryType: 'video',
      },

      // all the unhealthy little fellows
      {
        deliveryMethod: 'Email Telephone Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Single event (Cluster) Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: '',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Recurring event (Community Practice) Telephone Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Email Telephone',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'in-person',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Recurring event (Community Practice) Multi-grantee: Single event (Cluster) Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Email Multi-grantee: Recurring event (Community Practice) Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Recurring event (Community Practice) Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Single event (Cluster) Telephone Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Recurring event (Community Practice) Virtual',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Multi-grantee: Recurring event (Community Practice)',
        virtualDeliveryType: '',
      },
      {
        deliveryMethod: 'Email',
        virtualDeliveryType: '',
      },
    ];

    const activityRecipients = [];
    const userId = 1;
    const regionId = 1;

    reports = await Promise.all(
      delivery.map(
        async ({
          deliveryMethod,
          virtualDeliveryType,
        }) => createReport({
          activityRecipients,
          userId,
          regionId,
          deliveryMethod,
          virtualDeliveryType,
        }),
      ),
    );
  });

  afterAll(async () => {
    await Promise.all(
      reports.map((report) => destroyReport(report)),
    );

    await sequelize.close();
  });

  it('updates legacy population data', async () => {
    const reportIds = reports.map((report) => report.id);

    expect(reports.length).toBe(15);
    const before = await ActivityReport.findAll({
      attributes: [
        'id', 'deliveryMethod', 'virtualDeliveryType',
      ],
      where: {
        id: reportIds,
      },
    });

    expect(before.length).toBe(15);

    const beforeInfo = before.reduce((accumulator, current) => {
      let [deliveryMethod, virtualDeliveryType] = accumulator;
      if (current.deliveryMethod) {
        deliveryMethod = [...deliveryMethod, current.deliveryMethod];
      }
      if (current.virtualDeliveryType) {
        virtualDeliveryType = [...virtualDeliveryType, current.virtualDeliveryType];
      }

      return [deliveryMethod, virtualDeliveryType];
    }, [[], []]);

    const [beforeMethod, beforeType] = beforeInfo;

    expect(beforeMethod.length).toBe(14); // one less than before length
    expect(beforeMethod).toContain('virtual');
    expect(beforeMethod).toContain('Email Telephone Virtual');
    expect(beforeMethod).toContain('Multi-grantee: Single event (Cluster) Virtual');
    expect(beforeMethod).toContain('Multi-grantee: Recurring event (Community Practice) Telephone Virtual');
    expect(beforeMethod).toContain('Email Telephone');
    expect(beforeMethod).toContain('Virtual');
    expect(beforeMethod).toContain('in-person');
    expect(beforeMethod).toContain('Multi-grantee: Recurring event (Community Practice) Multi-grantee: Single event (Cluster) Virtual');
    expect(beforeMethod).toContain('Email Multi-grantee: Recurring event (Community Practice) Virtual');
    expect(beforeMethod).toContain('Multi-grantee: Recurring event (Community Practice) Virtual');
    expect(beforeMethod).toContain('Multi-grantee: Single event (Cluster) Telephone Virtual');
    expect(beforeMethod).toContain('Multi-grantee: Recurring event (Community Practice) Virtual');
    expect(beforeMethod).toContain('Multi-grantee: Recurring event (Community Practice)');
    expect(beforeMethod).toContain('Email');
    expect(beforeMethod).toContain('Email Telephone');

    expect(beforeType.length).toBe(1);
    expect(beforeType).toContain('video');

    await updateDeliveryData();

    const after = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(after.length).toBe(15);

    const afterInfo = after.reduce((accumulator, current) => {
      let [deliveryMethod, virtualDeliveryType] = accumulator;

      if (current.deliveryMethod) {
        deliveryMethod = [...deliveryMethod, current.deliveryMethod];
      }
      if (current.virtualDeliveryType) {
        virtualDeliveryType = [...virtualDeliveryType, current.virtualDeliveryType];
      }

      return [deliveryMethod, virtualDeliveryType];
    }, [[], []]);

    const [afterMethod, afterType] = afterInfo;

    expect(afterMethod.length).toBe(13);
    expect(afterMethod).toContain('virtual');
    expect(afterMethod).not.toContain('Email Telephone Virtual');
    expect(afterMethod).not.toContain('Multi-grantee: Single event (Cluster) Virtual');
    expect(afterMethod).not.toContain('Multi-grantee: Recurring event (Community Practice) Telephone Virtual');
    expect(afterMethod).not.toContain('Email Telephone');
    expect(afterMethod).toContain('Virtual');
    expect(afterMethod).toContain('in-person');
    expect(afterMethod).not.toContain('Multi-grantee: Recurring event (Community Practice) Multi-grantee: Single event (Cluster) Virtual');
    expect(afterMethod).not.toContain('Email Multi-grantee: Recurring event (Community Practice) Virtual');
    expect(afterMethod).not.toContain('Multi-grantee: Recurring event (Community Practice) Virtual');
    expect(afterMethod).not.toContain('Multi-grantee: Single event (Cluster) Telephone Virtual');
    expect(afterMethod).not.toContain('Multi-grantee: Recurring event (Community Practice) Virtual');
    expect(afterMethod).not.toContain('Multi-grantee: Recurring event (Community Practice)');
    expect(afterMethod).not.toContain('Email');
    expect(afterMethod).not.toContain('Email Telephone');

    expect(afterType.length).toBe(6);
    expect(afterType).toContain('video');
  });
});
