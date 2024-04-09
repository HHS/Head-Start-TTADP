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
import escapeFields, { escapeDataFields } from '../escapeFields';

const {
  ActivityReportApprover,
  ActivityReport,
  EventReportPilot,
} = db;

const xss = '<script>alert("XSS")</script>';
const safe = '';

describe('escapeFields', () => {
  test('should escape specified fields in the instance', () => {
    const instance = {
      field1: xss,
      field2: 'Hello World',
      field3: null,
      set: jest.fn(),
      changed: jest.fn().mockReturnValue(['field1', 'field2']),
    };

    const fieldsToEscape = ['field1', 'field2'];

    escapeFields(instance, fieldsToEscape);

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

    escapeFields(instance, fieldsToEscape);

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

    escapeFields(instance, fieldsToEscape);

    expect(instance.set).not.toHaveBeenCalled();
  });

  describe('escapeDataFields', () => {
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

      escapeDataFields(instance, fieldsToEscape);

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

      escapeDataFields(instance, fieldsToEscape);

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

      escapeDataFields(instance, fieldsToEscape);

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
      });

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

    it('properly escaped fields', async () => {
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
      await EventReportPilot.update(
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
