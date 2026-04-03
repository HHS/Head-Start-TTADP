import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import {
  COMMUNICATION_METHODS,
  COMMUNICATION_RESULTS,
  COMMUNICATION_PURPOSES,
} from '@ttahub/common';
import db from '../../models';
import { createUser, createRecipient, createGrant } from '../../testUtils';
import { logsByRecipientAndScopes } from '../../services/communicationLog';
import { communicationLogFiltersToScopes } from './index';
import { withinCommunicationDate } from './communicationDate';
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

  describe('group filters', () => {
    let groupRecipient1;
    let groupRecipient2;
    let grant1;
    let grant2;
    let group1;
    let group2;
    let group1Collaborator;
    let group2Collaborator;
    let logInGroup1;
    let logInGroup2;
    let possibleLogIds;

    beforeAll(async () => {
      const baseData = {
        communicationDate: '2023/06/01',
        result: COMMUNICATION_RESULTS[0],
        method: COMMUNICATION_METHODS[0],
        purpose: COMMUNICATION_PURPOSES[0],
      };

      groupRecipient1 = await createRecipient();
      groupRecipient2 = await createRecipient();

      grant1 = await createGrant({ recipientId: groupRecipient1.id });
      grant2 = await createGrant({ recipientId: groupRecipient2.id });

      group1 = await db.Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        isPublic: false,
      });

      group2 = await db.Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        isPublic: true,
      });

      group1Collaborator = await db.GroupCollaborator.create({
        groupId: group1.id,
        userId: user.id,
        collaboratorTypeId: 1,
      });

      group2Collaborator = await db.GroupCollaborator.create({
        groupId: group2.id,
        userId: secondUser.id,
        collaboratorTypeId: 1,
      });

      await db.GroupGrant.create({ groupId: group1.id, grantId: grant1.id });
      await db.GroupGrant.create({ groupId: group2.id, grantId: grant2.id });

      logInGroup1 = await db.CommunicationLog.create({
        userId: user.id,
        data: baseData,
      });

      logInGroup2 = await db.CommunicationLog.create({
        userId: secondUser.id,
        data: baseData,
      });

      await db.CommunicationLogRecipient.bulkCreate([
        { recipientId: groupRecipient1.id, communicationLogId: logInGroup1.id },
        { recipientId: groupRecipient2.id, communicationLogId: logInGroup2.id },
      ]);

      possibleLogIds = [logInGroup1.id, logInGroup2.id];
    });

    afterAll(async () => {
      await db.CommunicationLogRecipient.destroy({
        where: { communicationLogId: possibleLogIds },
      });
      await db.CommunicationLog.destroy({
        where: { id: possibleLogIds },
      });
      await db.GroupGrant.destroy({
        where: { groupId: [group1.id, group2.id] },
      });
      await db.GroupCollaborator.destroy({
        where: { id: [group1Collaborator.id, group2Collaborator.id] },
      });
      await db.Group.destroy({
        where: { id: [group1.id, group2.id] },
      });
      await db.Grant.destroy({
        where: { id: [grant1.id, grant2.id] },
        individualHooks: true,
      });
      await db.Recipient.destroy({
        where: { id: [groupRecipient1.id, groupRecipient2.id] },
      });
    });

    it('filters by a single group id', async () => {
      const scopes = communicationLogFiltersToScopes(
        { 'group.in': [String(group1.id)] },
        undefined,
        user.id,
      );
      const found = await db.CommunicationLog.findAll({
        where: { [Op.and]: [...scopes, { id: possibleLogIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(logInGroup1.id);
    });

    it('filters by a public group', async () => {
      const scopes = communicationLogFiltersToScopes(
        { 'group.in': [String(group2.id)] },
        undefined,
        user.id,
      );
      const found = await db.CommunicationLog.findAll({
        where: { [Op.and]: [...scopes, { id: possibleLogIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(logInGroup2.id);
    });

    it('filters by multiple group ids', async () => {
      const scopes = communicationLogFiltersToScopes(
        { 'group.in': [String(group1.id), String(group2.id)] },
        undefined,
        user.id,
      );
      const found = await db.CommunicationLog.findAll({
        where: { [Op.and]: [...scopes, { id: possibleLogIds }] },
      });
      expect(found.length).toBe(2);
      const foundIds = found.map((f) => f.id);
      expect(foundIds).toContain(logInGroup1.id);
      expect(foundIds).toContain(logInGroup2.id);
    });

    it('filters out by a single group id', async () => {
      const scopes = communicationLogFiltersToScopes(
        { 'group.nin': [String(group1.id)] },
        undefined,
        user.id,
      );
      const found = await db.CommunicationLog.findAll({
        where: { [Op.and]: [...scopes, { id: possibleLogIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(logInGroup2.id);
    });

    it('filters out by multiple group ids', async () => {
      const scopes = communicationLogFiltersToScopes(
        { 'group.nin': [String(group1.id), String(group2.id)] },
        undefined,
        user.id,
      );
      const found = await db.CommunicationLog.findAll({
        where: { [Op.and]: [...scopes, { id: possibleLogIds }] },
      });
      expect(found.length).toBe(0);
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
