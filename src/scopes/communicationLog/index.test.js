import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import {
  COMMUNICATION_METHODS,
  COMMUNICATION_RESULTS,
  COMMUNICATION_PURPOSES,
} from '@ttahub/common';
import db from '../../models';
import { createUser, createRecipient } from '../../testUtils';
import { logsByRecipientAndScopes } from '../../services/communicationLog';
import { communicationLogFiltersToScopes } from './index';
import { withinCommunicationDate } from './communicationDate';
import { withGroup, withoutGroup } from './group';
import { withPurpose, withoutPurpose } from './purpose';
import { withRoles, withoutRoles } from './role';

describe('communicationLog filtersToScopes', () => {
  const userName = faker.name.findName();
  const secondUserName = faker.name.findName();
  let user;
  let secondUser;
  let recipient;
  let ignoredRecipient;
  const regionId = faker.datatype.number({ min: 10000, max: 100000 });
  let region;
  let userRole;
  let secondUserRole;
  const createdRoles = [];
  let createdUserRoles = [];

  let communicationLogs = [];
  let logForIgnoredRecipient;

  beforeAll(async () => {
    region = await db.Region.create({
      id: regionId,
      name: `Region ${regionId}`,
    });

    user = await createUser({ homeRegionId: regionId, name: userName });
    secondUser = await createUser({ homeRegionId: regionId, name: secondUserName });

    userRole = await db.Role.findOne({ where: { fullName: 'System Specialist' } });
    if (!userRole) {
      userRole = await db.Role.create({
        name: 'SS',
        fullName: 'System Specialist',
        isSpecialist: true,
      });
      createdRoles.push(userRole);
    }

    secondUserRole = await db.Role.findOne({ where: { fullName: 'COR' } });
    if (!secondUserRole) {
      secondUserRole = await db.Role.create({
        name: 'COR',
        fullName: 'COR',
        isSpecialist: false,
      });
      createdRoles.push(secondUserRole);
    }

    createdUserRoles = await Promise.all([
      db.UserRole.create({
        userId: user.id,
        roleId: userRole.id,
      }),
      db.UserRole.create({
        userId: secondUser.id,
        roleId: secondUserRole.id,
      }),
    ]);

    recipient = await createRecipient();
    ignoredRecipient = await createRecipient();

    const defaultLog = {
      userId: user.id,
    };

    const defaultData = {
      communicationDate: '2023/01/01',
      result: COMMUNICATION_RESULTS[0],
      method: COMMUNICATION_METHODS[0],
      purpose: COMMUNICATION_PURPOSES[0],
    };

    communicationLogs = await Promise.all([
      db.CommunicationLog.create({
        ...defaultLog,
        data: {
          ...defaultData,
          communicationDate: '2022/12/01',
        },
      }),
      db.CommunicationLog.create({
        ...defaultLog,
        data: {
          ...defaultData,
          result: COMMUNICATION_RESULTS[1],
        },
      }),
      db.CommunicationLog.create({
        ...defaultLog,
        data: {
          ...defaultData,
          method: COMMUNICATION_METHODS[1],
          purpose: COMMUNICATION_PURPOSES[1],
        },
      }),
      db.CommunicationLog.create({
        ...defaultLog,
        userId: secondUser.id,
        data: defaultData,
      }),
    ]);

    await db.CommunicationLogRecipient.bulkCreate(communicationLogs.map((log) => ({
      recipientId: recipient.id,
      communicationLogId: log.id,
    })));

    logForIgnoredRecipient = await db.CommunicationLog.create({
      ...defaultLog,
      data: defaultData,
    });

    await db.CommunicationLogRecipient.create({
      recipientId: ignoredRecipient.id,
      communicationLogId: logForIgnoredRecipient.id,
    });
  });

  afterAll(async () => {
    await db.UserRole.destroy({
      where: {
        id: createdUserRoles.map((createdRole) => createdRole.id),
      },
    });
    await db.Role.destroy({
      where: {
        id: createdRoles.map((role) => role.id),
      },
    });
    await db.CommunicationLogRecipient.destroy({
      where: {
        communicationLogId: [
          ...communicationLogs.map((log) => log.id),
          logForIgnoredRecipient?.id,
        ],
      },
    });

    await db.CommunicationLog.destroy({
      where: {
        id: [
          ...communicationLogs.map((log) => log.id),
          logForIgnoredRecipient?.id,
        ],
      },
    });
    await db.Recipient.destroy({
      where: {
        id: [
          recipient.id,
          ignoredRecipient.id,
        ],
      },
    });
    await db.User.destroy({
      where: {
        id: [user.id, secondUser.id],
      },
    });
    await db.Region.destroy({ where: { id: region.id } });
    await db.sequelize.close();
  });

  it('should return all logs when no filters are provided', async () => {
    const scopes = communicationLogFiltersToScopes([]);
    const { rows, count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(4);

    const recipientIds = rows.map((row) => row.recipientId);
    expect(recipientIds).not.toContain(ignoredRecipient.id);
  });

  it('filters by result within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'result.in': [COMMUNICATION_RESULTS[1]],
    });

    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by result without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'result.nin': [COMMUNICATION_RESULTS[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by purpose within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'purpose.in': [COMMUNICATION_PURPOSES[1]],
    });

    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by purpose without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'purpose.nin': [COMMUNICATION_PURPOSES[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by method within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'method.in': [COMMUNICATION_METHODS[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by method without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'method.nin': [COMMUNICATION_METHODS[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by creator within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'creator.ctn': [secondUserName.substring(0, 8)],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by creator without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'creator.nctn': [secondUserName.substring(0, 8)],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by role within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'role.in': [userRole.fullName],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by role without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'role.nin': [userRole.fullName],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by communication date before', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.bef': ['2022/12/15'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by communication date after', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.aft': ['2022/12/31'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });
  it('filters by communication date within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.win': ['2022/10/01-2022/12/15'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by communication date in', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.in': ['2022/10/01-2022/12/15'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('returns empty when the dates split at "-" is less than 2', () => {
    const out = withinCommunicationDate(['2022/10/01']);
    expect(out).toMatchObject({});
  });

  describe('group filters', () => {
    let groupedRecipient;
    let notGroupedRecipient;
    let targetRecipient;
    let groupedGrant;
    let notGroupedGrant;
    let group;
    let group2;
    let logs;

    beforeAll(async () => {
      groupedRecipient = await createRecipient();
      notGroupedRecipient = await createRecipient();
      targetRecipient = await createRecipient();

      groupedGrant = await db.Grant.create({
        id: faker.datatype.number({ min: 100000, max: 999999 }),
        number: `group-${faker.datatype.number({ min: 1000, max: 9999 })}`,
        recipientId: groupedRecipient.id,
        regionId,
        status: 'Active',
        startDate: new Date('2021/01/01'),
      });

      notGroupedGrant = await db.Grant.create({
        id: faker.datatype.number({ min: 100000, max: 999999 }),
        number: `group2-${faker.datatype.number({ min: 1000, max: 9999 })}`,
        recipientId: notGroupedRecipient.id,
        regionId,
        status: 'Active',
        startDate: new Date('2021/01/01'),
      });

      group = await db.Group.create({
        name: `Communication Log Group ${faker.datatype.number({ min: 1, max: 9999 })}`,
        isPublic: false,
      });

      group2 = await db.Group.create({
        name: `Communication Log Group2 ${faker.datatype.number({ min: 1, max: 9999 })}`,
        isPublic: true,
      });

      await db.GroupCollaborator.create({
        groupId: group.id,
        userId: user.id,
        collaboratorTypeId: 1,
      });

      await db.GroupGrant.create({
        groupId: group.id,
        grantId: groupedGrant.id,
      });

      await db.GroupGrant.create({
        groupId: group2.id,
        grantId: notGroupedGrant.id,
      });

      const defaultData = {
        communicationDate: '2023/03/15',
        result: COMMUNICATION_RESULTS[0],
        method: COMMUNICATION_METHODS[0],
        purpose: COMMUNICATION_PURPOSES[0],
      };

      logs = await Promise.all([
        db.CommunicationLog.create({
          userId: user.id,
          data: defaultData,
        }),
        db.CommunicationLog.create({
          userId: user.id,
          data: defaultData,
        }),
      ]);

      await db.CommunicationLogRecipient.bulkCreate([
        {
          communicationLogId: logs[0].id,
          recipientId: targetRecipient.id,
        },
        {
          communicationLogId: logs[0].id,
          recipientId: groupedRecipient.id,
        },
        {
          communicationLogId: logs[1].id,
          recipientId: targetRecipient.id,
        },
        {
          communicationLogId: logs[1].id,
          recipientId: notGroupedRecipient.id,
        },
      ]);
    });

    afterAll(async () => {
      await db.CommunicationLogRecipient.destroy({
        where: {
          communicationLogId: logs.map((log) => log.id),
        },
      });

      await db.CommunicationLog.destroy({
        where: {
          id: logs.map((log) => log.id),
        },
      });

      await db.GroupGrant.destroy({
        where: {
          groupId: [group.id, group2.id],
        },
      });

      await db.GroupCollaborator.destroy({
        where: {
          groupId: group.id,
          userId: user.id,
        },
      });

      await db.Group.destroy({
        where: {
          id: [group.id, group2.id],
        },
      });

      await db.Grant.destroy({
        where: {
          id: [groupedGrant.id, notGroupedGrant.id],
        },
        individualHooks: true,
      });

      await db.Recipient.destroy({
        where: {
          id: [groupedRecipient.id, notGroupedRecipient.id, targetRecipient.id],
        },
      });
    });

    describe('group scopes', () => {
      it('includes multiple groups when passed as a comma-delimited array entry', () => {
        const result = withGroup(['123,456'], user.id);
        const sql = result.id[Op.in].val;

        expect(sql).toContain('WHERE g.id IN (123,456)');
        expect(sql).toContain(`gc."userId" = ${user.id}`);
      });

      it('includes multiple groups when passed as separate array values', () => {
        const result = withGroup(['123', '456'], user.id);
        const sql = result.id[Op.in].val;

        expect(sql).toContain('WHERE g.id IN (123,456)');
      });

      it('excludes multiple groups when passed as a comma-delimited array entry', () => {
        const result = withoutGroup(['123,456'], user.id);
        const sql = result.id[Op.notIn].val;

        expect(sql).toContain('WHERE g.id IN (123,456)');
        expect(sql).toContain(`gc."userId" = ${user.id}`);
      });

      it('excludes multiple groups when passed as separate array values', () => {
        const result = withoutGroup(['123', '456'], user.id);
        const sql = result.id[Op.notIn].val;

        expect(sql).toContain('WHERE g.id IN (123,456)');
      });
    });

    it('filters by group within', async () => {
      const scopes = communicationLogFiltersToScopes({
        'group.in': [String(group.id)],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(targetRecipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
      expect(count).toBe(1);
    });

    it('filters by group without', async () => {
      const scopes = communicationLogFiltersToScopes({
        'group.nin': [String(group.id)],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(targetRecipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
      expect(count).toBe(1);
    });

    it('filters multiple groups (in) with comma-separated group ids', async () => {
      const scopes = communicationLogFiltersToScopes({
        'group.in': [`${group.id},${group2.id}`],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(targetRecipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
      expect(count).toBe(2);
    });

    it('filters multiple groups (in) with separate array params', async () => {
      const scopes = communicationLogFiltersToScopes({
        'group.in': [String(group.id), String(group2.id)],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(targetRecipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
      expect(count).toBe(2);
    });

    it('filters multiple groups (nin) with comma-separated group ids', async () => {
      const scopes = communicationLogFiltersToScopes({
        'group.nin': [`${group.id},${group2.id}`],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(targetRecipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
      expect(count).toBe(0);
    });

    it('filters multiple groups (nin) with separate array params', async () => {
      const scopes = communicationLogFiltersToScopes({
        'group.nin': [String(group.id), String(group2.id)],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(targetRecipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
      expect(count).toBe(0);
    });
  });

  describe('myReports filters', () => {
    let myReportsRecipient;
    let myReportsLogs;

    beforeAll(async () => {
      myReportsRecipient = await createRecipient();

      const baseData = {
        communicationDate: '2023/01/10',
        result: COMMUNICATION_RESULTS[0],
        method: COMMUNICATION_METHODS[0],
        purpose: COMMUNICATION_PURPOSES[0],
      };

      myReportsLogs = await Promise.all([
        db.CommunicationLog.create({
          userId: user.id,
          data: {
            ...baseData,
          },
        }),
        db.CommunicationLog.create({
          userId: secondUser.id,
          data: {
            ...baseData,
            otherStaff: [{ value: String(user.id) }],
          },
        }),
        db.CommunicationLog.create({
          userId: secondUser.id,
          data: {
            ...baseData,
            otherStaff: [{ value: String(secondUser.id) }],
          },
        }),
      ]);

      await db.CommunicationLogRecipient.bulkCreate(myReportsLogs.map((log) => ({
        recipientId: myReportsRecipient.id,
        communicationLogId: log.id,
      })));
    });

    afterAll(async () => {
      await db.CommunicationLogRecipient.destroy({
        where: {
          communicationLogId: myReportsLogs.map((log) => log.id),
        },
      });

      await db.CommunicationLog.destroy({
        where: {
          id: myReportsLogs.map((log) => log.id),
        },
      });

      await db.Recipient.destroy({
        where: {
          id: myReportsRecipient.id,
        },
      });
    });

    it('filters by my reports creator', async () => {
      const scopes = communicationLogFiltersToScopes({
        'myReports.in': ['Creator'],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(
        myReportsRecipient.id,
        'communicationDate',
        0,
        'DESC',
        10,
        scopes,
      );

      expect(count).toBe(1);
    });

    it('filters by my reports other staff', async () => {
      const scopes = communicationLogFiltersToScopes({
        'myReports.in': ['Other TTA staff'],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(
        myReportsRecipient.id,
        'communicationDate',
        0,
        'DESC',
        10,
        scopes,
      );

      expect(count).toBe(1);
    });

    it('filters by my reports creator or other staff', async () => {
      const scopes = communicationLogFiltersToScopes({
        'myReports.in': ['Creator,Other TTA staff'],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(
        myReportsRecipient.id,
        'communicationDate',
        0,
        'DESC',
        10,
        scopes,
      );

      expect(count).toBe(2);
    });

    it('filters by my reports not creator or other staff', async () => {
      const scopes = communicationLogFiltersToScopes({
        'myReports.nin': ['Creator,Other TTA staff'],
      }, undefined, user.id);

      const { count } = await logsByRecipientAndScopes(
        myReportsRecipient.id,
        'communicationDate',
        0,
        'DESC',
        10,
        scopes,
      );

      expect(count).toBe(1);
    });
  });

  describe('role scope unit tests', () => {
    describe('withRoles', () => {
      it('returns empty object for invalid roles', () => {
        const result = withRoles(['COR']);
        expect(result).toEqual({});
      });

      it('includes a comma-delimited array entry as multiple roles', () => {
        const result = withRoles(['Early Childhood Specialist,Health Specialist']);
        const sql = result.id[Op.in].val;

        expect(sql).toContain("'Early Childhood Specialist'");
        expect(sql).toContain("'Health Specialist'");
      });
    });

    describe('withoutRoles', () => {
      it('returns empty object for invalid roles', () => {
        const result = withoutRoles(['COR']);
        expect(result).toEqual({});
      });

      it('excludes multiple roles when passed as a comma-delimited array entry', () => {
        const result = withoutRoles(['Early Childhood Specialist,Health Specialist']);
        const sql = result.id[Op.notIn].val;

        expect(sql).toContain("'Early Childhood Specialist'");
        expect(sql).toContain("'Health Specialist'");
      });

      it('excludes multiple roles when passed as separate array values', () => {
        const result = withoutRoles(['Early Childhood Specialist', 'Health Specialist']);
        const sql = result.id[Op.notIn].val;

        expect(sql).toContain("'Early Childhood Specialist'");
        expect(sql).toContain("'Health Specialist'");
      });
    });
  });
});

describe('communicationLog purpose scope', () => {
  describe('withPurpose', () => {
    it('returns an Op.in scope for the given purposes', () => {
      const result = withPurpose(['Planning']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.in]: ['Planning'],
          },
        },
      });
    });

    it('splits comma-separated values within a single entry', () => {
      const result = withPurpose(['Planning,Monitoring']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.in]: ['Planning', 'Monitoring'],
          },
        },
      });
    });

    it('trims whitespace around split values', () => {
      const result = withPurpose(['Planning , Monitoring']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.in]: ['Planning', 'Monitoring'],
          },
        },
      });
    });

    it('handles multiple entries, each potentially comma-separated', () => {
      const result = withPurpose(['Planning,Monitoring', 'Training']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.in]: ['Planning', 'Monitoring', 'Training'],
          },
        },
      });
    });
  });

  describe('withoutPurpose', () => {
    it('returns an Op.notIn scope for the given purposes', () => {
      const result = withoutPurpose(['Planning']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.notIn]: ['Planning'],
          },
        },
      });
    });

    it('splits comma-separated values within a single entry', () => {
      const result = withoutPurpose(['Planning,Monitoring']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.notIn]: ['Planning', 'Monitoring'],
          },
        },
      });
    });

    it('trims whitespace around split values', () => {
      const result = withoutPurpose(['Planning , Monitoring']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.notIn]: ['Planning', 'Monitoring'],
          },
        },
      });
    });

    it('handles multiple entries, each potentially comma-separated', () => {
      const result = withoutPurpose(['Planning,Monitoring', 'Training']);
      expect(result).toEqual({
        data: {
          purpose: {
            [Op.notIn]: ['Planning', 'Monitoring', 'Training'],
          },
        },
      });
    });
  });
});
