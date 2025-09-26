import faker from '@faker-js/faker';
import { APPROVER_STATUSES } from '@ttahub/common';
import db from '../..';
import {
  createReport,
  createTrainingReport,
  createRegion,
  createUser,
  destroyReport,
} from '../../../testUtils';
import { purifyFields, purifyDataFields } from '../purifyFields';

const {
  ActivityReportApprover,
  ActivityReport,
  TrainingReport,
} = db;

const xss = '<A HREF=//google.com><script>alert("XSS")</script><img src=x onerror=alert(1)//>';
const safe = '<a href="//google.com"><img src="x"></a>';

describe('purifyFields', () => {
  test('returns if changed is not in instance', () => {
    const instance = {
      set: jest.fn(),
    };

    purifyFields(instance, ['field1']);

    expect(instance.set).not.toHaveBeenCalled();
  });

  test('returns if changed does not return an array', () => {
    const instance = {
      set: jest.fn(),
      changed: jest.fn().mockReturnValue('not an array'),
    };

    purifyFields(instance, ['field1']);

    expect(instance.set).not.toHaveBeenCalled();
  });

  test('returns if the field value is not a string', () => {
    const instance = {
      set: jest.fn(),
      changed: jest.fn().mockReturnValue(['field1']),
      field1: 123,
    };

    purifyFields(instance, ['field1']);

    expect(instance.set).not.toHaveBeenCalled();
  });

  test('returns if changed is not a function', () => {
    const instance = {
      set: jest.fn(),
      changed: 'not a function',
    };

    purifyFields(instance, ['field1']);

    expect(instance.set).not.toHaveBeenCalled();
  });

  test('should escape specified fields in the instance', () => {
    const instance = {
      field1: xss,
      field2: 'Hello World',
      field3: null,
      set: jest.fn(),
      changed: jest.fn().mockReturnValue(['field1', 'field2']),
    };

    const fieldsToEscape = ['field1', 'field2'];

    purifyFields(instance, fieldsToEscape);

    expect(instance.set).toHaveBeenCalledTimes(2);
    expect(instance.set).toHaveBeenCalledWith('field1', safe);
    expect(instance.set).toHaveBeenCalledWith('field2', 'Hello World');
  });

  test('should not escape fields that are null', () => {
    const instance = {
      field1: null,
      field2: 'Hello World',
      set: jest.fn(),
      changed: jest.fn().mockReturnValue(['field1', 'field2']),
    };

    const fieldsToEscape = ['field1', 'field2'];

    purifyFields(instance, fieldsToEscape);

    expect(instance.set).toHaveBeenCalledTimes(1);
    expect(instance.set).toHaveBeenCalledWith('field2', 'Hello World');
  });

  test('should not modify the instance if it does not have the specified fields', () => {
    const instance = {
      set: jest.fn(),
      field1: null,
      field2: 'Hello World',
      changed: jest.fn().mockReturnValue(['field1']),
    };

    const fieldsToEscape = ['field1', 'field2'];

    purifyFields(instance, fieldsToEscape);

    expect(instance.set).not.toHaveBeenCalled();
  });

  describe('purifyDataFields', () => {
    test('should escape specified fields in the instance data', () => {
      const instance = {
        data: {
          field1: xss,
          field2: 'Hello World',
          field3: null,
        },
        set: jest.fn(),
      };

      const fieldsToEscape = ['field1', 'field2'];

      purifyDataFields(instance, fieldsToEscape);

      expect(instance.set).toHaveBeenCalledTimes(1);
      expect(instance.set).toHaveBeenCalledWith('data', {
        field1: safe,
        field2: 'Hello World',
        field3: null,
      });
    });

    test('should not escape fields that are null', () => {
      const instance = {
        data: {
          field1: null,
          field2: 'Hello World',
        },
        set: jest.fn(),
      };

      const fieldsToEscape = ['field1', 'field2'];

      purifyDataFields(instance, fieldsToEscape);

      expect(instance.set).toHaveBeenCalledTimes(1);
      expect(instance.set).toHaveBeenCalledWith('data', {
        field1: null,
        field2: 'Hello World',
      });
    });

    test('should not modify the instance data if it is not present', () => {
      const instance = {
        set: jest.fn(),
      };

      const fieldsToEscape = ['field1', 'field2'];

      purifyDataFields(instance, fieldsToEscape);

      expect(instance.set).not.toHaveBeenCalled();
    });
  });

  describe('live updates', () => {
    let region;
    let user;
    let approver;
    let report;
    let event;

    beforeAll(async () => {
      region = await createRegion();
      user = await createUser({ homeRegionId: region.id });
      report = await createReport({
        context: xss,
        activityRecipients: [{ grantId: faker.datatype.number({ min: 99_000 }) }],
        userId: user.id,
        regionId: region.id,
      });

      approver = await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: user.id,
        status: APPROVER_STATUSES.PENDING,
        note: xss,
      }, { individualHooks: true });

      event = await createTrainingReport({
        regionId: region.id,
        collaboratorIds: [user.id],
        pocIds: [user.id],
        ownerId: user.id,
        data: {
          eventName: xss,
        },
      });
    });

    test('properly escaped fields', async () => {
      expect(report.context).toBe(safe);
      expect(approver.note).toBe(safe);
      expect(event.data.eventName).toBe(safe);

      await ActivityReport.update(
        { context: xss },
        { where: { id: report.id }, individualHooks: true },
      );
      await ActivityReportApprover.update(
        { note: xss },
        { where: { id: approver.id }, individualHooks: true },
      );
      await TrainingReport.update(
        { data: { ...event.data, eventName: xss } },
        { where: { id: event.id }, individualHooks: true },
      );

      await report.reload();
      await approver.reload();
      await event.reload();

      expect(report.context).toBe(safe);
      expect(approver.note).toBe(safe);
      expect(event.data.eventName).toBe(safe);
    });

    afterAll(async () => {
      await approver.destroy({ force: true });
      await event.destroy();
      await destroyReport(report);
      await user.destroy();
      await region.destroy();
      await db.sequelize.close();
    });
  });
});
