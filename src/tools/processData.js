/* eslint-disable no-plusplus */
/* eslint-disable quotes */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import sequelize, { Op } from 'sequelize';
import cheerio from 'cheerio';
import faker from 'faker';
import {
  ActivityReport, User, Recipient, Grant, File, Permission, RequestErrors,
} from '../models';

const SITE_ACCESS = 1;
const ADMIN = 2;
const READ_WRITE_REPORTS = 3;
const READ_REPORTS = 4;
const APPROVE_REPORTS = 5;

/**
 * processData script replaces user names, emails, recipient and grant information,
 * file names as well as certain html fields with generated data while preserving
 * existing relationships and non-PII data.
 *
 * Resulting anonymized database can then be restored in non-production environments.
 */

let realUsers = [];
let transformedUsers = [];
let transformedRecipients = [];
let realGrants = [];
let transformedGrants = [];
const hsesUsers = [
  {
    name: 'Adam Levin', hsesUsername: 'test.tta.adam', hsesUserId: '50783', email: 'adam@adhocteam.us',
  },
  {
    name: 'Angela Waner', hsesUsername: 'test.tta.angela', hsesUserId: '50599', email: 'angela@adhocteam.us',
  },
  {
    name: 'Krys Wisnaskas', hsesUsername: 'test.tta.krys', hsesUserId: '50491', email: 'krys@adhocteam.us',
  },
  {
    name: 'Matt Bevilacqua', hsesUsername: 'test.tta.mattb', hsesUserId: '50832', email: 'matt@adhocteam.us',
  },
  {
    name: 'Kelly Born', hsesUsername: 'test.tta.kelly', hsesUserId: '51113', email: 'kelly@adhocteam.us',
  },
  {
    name: 'Lauren Rodriguez', hsesUsername: 'test.tta.lauren', hsesUserId: '51130', email: 'lauren@adhocteam.us',
  },
  {
    name: 'Christine Nguyen', hsesUsername: 'test.tta.christine', hsesUserId: '50450', email: 'christine@adhocteam.us',
  },
  {
    name: 'Ryan Ahearn', hsesUsername: 'test.tta.ryan', hsesUserId: '48831', email: 'ryan@adhocteam.us',
  },
  {
    name: 'Maria Puhl', hsesUsername: 'test.tta.maria', hsesUserId: '51298', email: 'maria@adhocteam.us',
  },
  {
    name: 'Patrice Pascual', hsesUsername: 'test.tta.patrice', hsesUserId: '45594', email: 'patrice@adhocteam.us',
  },
  {
    name: 'Josh Salisbury', hsesUsername: 'test.tta.josh', hsesUserId: '50490', email: 'josh@adhocteam.us',
  },
  {
    name: 'Rachel Miner', hsesUsername: 'test.tta.rachel', hsesUserId: '51352', email: 'rachel@adhocteam.us',
  },
  {
    name: 'Nathan Powell', hsesUsername: 'test.tta.nathan', hsesUserId: '51379', email: 'nathan.powell@adhocteam.us',
  },
  {
    name: 'Garrett Hill', hsesUsername: 'test.tta.garrett', hsesUserId: '51548', email: 'garrett.hill@adhocteam.us',
  },
];

const processHtml = async (input) => {
  if (!input) {
    return input;
  }

  const $ = cheerio.load(input);

  const getTextNodes = (elem) => (elem.type === 'text' ? [] : elem.contents().toArray()
    .filter((el) => el !== undefined)
    .reduce((acc, el) => acc.concat(...el.type === 'text' ? [el] : getTextNodes($(el))), []));

  getTextNodes($('html')).map((node) => $(node).replaceWith(
    $.html(node).trim() === '' // empty
      ? faker.random.words(0)
      : faker.random.words($.html(node).split(' ').length),
  ));

  return cheerio.load($.html(), null, false).html(); // html minus the html, head and body tags
};

const convertEmails = (emails) => {
  if (!emails) {
    return emails;
  }
  const emailsArray = emails.split(', ');
  const convertedEmails = emailsArray.map((email) => {
    const foundUser = realUsers.find((user) => user.email === email);
    const userId = foundUser ? foundUser.id : null;
    if (userId) {
      const foundTransformedUser = transformedUsers.find((user) => user.id === userId);
      return foundTransformedUser ? foundTransformedUser.email : '';
    }
    return emails.includes('@') ? faker.internet.email() : '';
  });

  return convertedEmails.join(', ');
};

const convertName = (name, email) => {
  if (!name) {
    return { name, email };
  }
  const additionalId = 99999;
  let foundUser = realUsers.find((user) => user.email === email);

  // Not all program specialists or grant specialist are in the Hub yet
  // Add it to the realUsers
  if (!foundUser && email.includes('@')) {
    foundUser = { id: additionalId + 1, name, email };
    realUsers.push(foundUser);
  }

  let foundTransformedUser = transformedUsers.find((user) => user.id === foundUser.id);
  if (!foundTransformedUser) {
    foundTransformedUser = {
      id: foundUser.id,
      name: faker.name.findName(),
      email: faker.internet.email(),
    };
    transformedUsers.push(foundTransformedUser);
  }
  return foundTransformedUser;
};

const convertFileName = (fileName) => {
  if (fileName === null) {
    return fileName;
  }
  const extension = fileName.slice(fileName.indexOf('.'));
  return `${faker.system.fileName()}${extension}`;
};

const convertRecipientName = (recipientsGrants) => {
  if (recipientsGrants === null) {
    return recipientsGrants;
  }

  const recipientGrantsArray = recipientsGrants ? recipientsGrants.split('\n') : [];

  const convertedRecipientsGrants = recipientGrantsArray.map((recipientGrant) => {
    const recipientGrantArray = recipientGrant.split('|');
    const grant = recipientGrantArray.length > 1 ? recipientGrantArray[1].trim() : 'Missing Grant';

    const foundGrant = realGrants.find((g) => g.number === grant);
    // get ids of real grants and recipients;
    const recipientId = foundGrant ? foundGrant.recipientId : null;
    const grantId = foundGrant ? foundGrant.id : null;
    // find corresponding transformed grants and recipients
    const foundTransformedRecipient = transformedRecipients.find((g) => g.id === recipientId);
    const foundTransformedGrant = transformedGrants.find((g) => g.id === grantId);

    const transformedRecipientName = foundTransformedRecipient ? foundTransformedRecipient.name : 'Unknown Recipient';
    const transformedGrantNumber = foundTransformedGrant ? foundTransformedGrant.number : 'UnknownGrant';
    return `${transformedRecipientName} | ${transformedGrantNumber}`;
  });

  return convertedRecipientsGrants.join('\n');
};

export const hideUsers = async (userIds) => {
  const ids = userIds || null;
  const where = ids ? { id: ids } : {};
  // save real users
  realUsers = (await User.findAll({
    attributes: ['id', 'email', 'name'],
    where,
  })).map((u) => u.dataValues);

  const users = await User.findAll({
    where,
  });
  const promises = [];
  // loop through the found users
  for (const user of users) {
    promises.push(
      user.update({
        hsesUsername: faker.internet.email(),
        email: faker.internet.email(),
        phoneNumber: faker.phone.phoneNumber(),
        name: faker.name.findName(),
      }),
    );
  }

  await Promise.all(promises);
  // Retrieve transformed users
  transformedUsers = (await User.findAll({
    attributes: ['id', 'email', 'name'],
  })).map((u) => u.dataValues);
};

export const hideRecipientsGrants = async (recipientsGrants) => {
  realGrants = (await Grant.findAll({
    attributes: ['id', 'recipientId', 'number'],
  })).map((g) => g.dataValues);

  const recipientsArray = recipientsGrants ? recipientsGrants.split('\n').map((el) => el.split('|')[0].trim()) : null;
  const grantsArray = (recipientsArray && recipientsArray.length > 1) ? recipientsGrants.split('\n').map((el) => el.split('|')[1].trim()) : null;
  const recipientWhere = recipientsArray
    ? { name: { [Op.like]: { [Op.any]: recipientsArray } } }
    : {};
  const grantWhere = grantsArray ? { number: { [Op.like]: { [Op.any]: grantsArray } } } : {};
  const recipients = await Recipient.findAll({
    where: recipientWhere,
  });

  const promises = [];

  // loop through the found reports
  for (const recipient of recipients) {
    promises.push(
      recipient.update({
        name: faker.company.companyName(),
      }),
    );
  }
  const grants = await Grant.findAll({
    where: grantWhere,
  });

  for (const grant of grants) {
    // run this first
    const programSpecialist = convertName(
      grant.programSpecialistName,
      grant.programSpecialistEmail,
    );
    const grantSpecialist = convertName(
      grant.grantSpecialistName,
      grant.grantSpecialistEmail,
    );
    const trailingNumber = grant.id;
    const newGrantNumber = `0${faker.datatype.number({ min: 1, max: 9 })}${faker.animal.type()}0${trailingNumber}`;

    promises.push(
      grant.update({
        number: newGrantNumber,
        programSpecialistName: programSpecialist.name,
        programSpecialistEmail: programSpecialist.email,
        grantSpecialistName: grantSpecialist.name,
        grantSpecialistEmail: grantSpecialist.email,
      }),
    );
  }
  await Promise.all(promises);

  // Retrieve transformed recipients
  transformedRecipients = (await Recipient.findAll({
    attributes: ['id', 'name'],
    where: { id: recipients.map((g) => g.id) },
  })).map((g) => g.dataValues);

  // Retrieve transformed grants
  transformedGrants = (await Grant.findAll({
    attributes: ['id', 'number'],
    where: { id: grants.map((g) => g.id) },
  })).map((g) => g.dataValues);
};

const givePermissions = (id) => {
  const permissionsArray = [
    {
      userId: id,
      scopeId: SITE_ACCESS,
      regionId: 14,
    },
    {
      userId: id,
      regionId: 14,
      scopeId: ADMIN,
    },
    {
      userId: id,
      regionId: 1,
      scopeId: READ_WRITE_REPORTS,
    },
    {
      userId: id,
      regionId: 1,
      scopeId: APPROVE_REPORTS,
    },
  ];

  for (let region = 1; region < 13; region++) {
    permissionsArray.push({
      userId: id,
      regionId: region,
      scopeId: READ_REPORTS,
    });
  }

  return permissionsArray;
};
export const bootstrapUsers = async () => {
  const userPromises = [];
  for await (const hsesUser of hsesUsers) {
    const user = await User.findOne({ where: { hsesUserId: hsesUser.hsesUserId } });
    let id;
    const newUser = {
      ...hsesUser,
      homeRegionId: 14,
      role: sequelize.literal(`ARRAY['Central Office']::"enum_Users_role"[]`),
      hsesAuthorities: ['ROLE_FEDERAL'],
    };
    if (user) {
      id = user.id;
      userPromises.push(user.update(newUser));
      for (const permission of givePermissions(id)) {
        userPromises.push(Permission.findOrCreate({ where: permission }));
      }
    } else {
      const createdUser = await User.create(newUser);
      if (createdUser) {
        for (const permission of givePermissions(createdUser.id)) {
          userPromises.push(Permission.findOrCreate({ where: permission }));
        }
      }
    }

    await Promise.all(userPromises);
  }
};

const processData = async (mockReport) => {
  const activityReportId = mockReport ? mockReport.id : null;
  const where = activityReportId ? { id: activityReportId } : {};
  const filesWhere = activityReportId ? { activityReportId } : {};
  const userIds = mockReport ? [3000, 3001, 3002, 3003] : null;

  const recipientsGrants = mockReport ? mockReport.imported.granteeName : null;
  const reports = await ActivityReport.unscoped().findAll({
    where,
  });

  const files = await File.findAll({
    where: filesWhere,
  });

  const promises = [];

  // Hide users
  await hideUsers(userIds);
  // Hide recipients and grants
  await hideRecipientsGrants(recipientsGrants);

  // loop through the found reports
  for await (const report of reports) {
    const { imported } = report;

    promises.push(
      report.update({
        managerNotes: await processHtml(report.managerNotes),
        additionalNotes: await processHtml(report.additionalNotes),
        context: await processHtml(report.context),
      }),
    );
    if (imported) {
      const newImported = {
        additionalNotesForThisActivity: await processHtml(
          imported.additionalNotesForThisActivity,
        ),
        cdiGranteeName: await processHtml(imported.cdiGranteeName),
        contextForThisActivity: await processHtml(
          imported.contextForThisActivity,
        ),
        created: imported.created,
        createdBy: convertEmails(imported.createdBy),
        duration: imported.duration,
        endDate: imported.endDate,
        format: imported.format,
        goal1: imported.goal1,
        goal2: imported.goal2,
        granteeFollowUpTasksObjectives: await processHtml(
          imported.granteeFollowUpTasksObjectives,
        ),
        granteeName: convertRecipientName(imported.granteeName),
        granteeParticipants: imported.granteeParticipants,
        granteesLearningLevelGoal1: imported.granteesLearningLevelGoal1,
        granteesLearningLevelGoal2: imported.granteesLearningLevelGoal2,
        manager: convertEmails(imported.manager),
        modified: imported.modified,
        modifiedBy: convertEmails(imported.modifiedBy),
        multiGranteeActivities: imported.multiGranteeActivities,
        nonGranteeActivity: imported.nonGranteeActivity,
        nonGranteeParticipants: imported.nonGranteeParticipants,
        nonOhsResources: imported.nonOhsResources,
        numberOfParticipants: imported.numberOfParticipants,
        objective11: imported.objective11,
        objective11Status: imported.objective11Status,
        objective12: imported.objective12,
        objective12Status: imported.objective12Status,
        objective21: imported.objective21,
        objective21Status: imported.objective21Status,
        objective22: imported.objective22,
        objective22Status: imported.objective22Status,
        otherSpecialists: convertEmails(imported.otherSpecialists),
        otherTopics: imported.otherTopics,
        programType: imported.programType,
        reasons: imported.reasons,
        reportId: imported.reportId,
        resourcesUsed: imported.resourcesUsed,
        sourceOfRequest: imported.sourceOfRequest,
        specialistFollowUpTasksObjectives: await processHtml(
          imported.specialistFollowUpTasksObjectives,
        ),
        startDate: imported.startDate,
        tTa: imported.tTa,
        targetPopulations: imported.targetPopulations,
        topics: imported.topics,
        ttaProvidedAndGranteeProgressMade: imported.ttaProvidedAndGranteeProgressMade,
      };
      promises.push(report.update({ imported: newImported }));
    }
  }

  for (const file of files) {
    promises.push(
      file.update({
        originalFileName: convertFileName(file.originalFileName),
      }),
    );
  }

  await bootstrapUsers();

  // Delete from RequestErrors
  await RequestErrors.destroy({
    where: {},
    truncate: true,
  });

  return Promise.all(promises);
};

export default processData;
