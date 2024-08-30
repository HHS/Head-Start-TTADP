/* eslint-disable no-plusplus */
/* eslint-disable quotes */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
import faker from '@faker-js/faker';
import {
  User,
  Permission,
  RequestErrors,
  sequelize,
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
let realRecipients = [];
const hsesUsers = [
  {
    name: 'Adam Levin', hsesUsername: 'test.tta.adam', hsesUserId: '50783', email: 'adam.levin@adhocteam.us',
  },
  {
    name: 'Krys Wisnaskas', hsesUsername: 'test.tta.krys', hsesUserId: '50491', email: 'krystyna@adhocteam.us',
  },
  {
    name: 'Matt Bevilacqua', hsesUsername: 'test.tta.mattb', hsesUserId: '50832', email: 'matt.bevilacqua@adhocteam.us',
  },
  {
    name: 'Kelly Born', hsesUsername: 'test.tta.kelly', hsesUserId: '51113', email: 'kelly.born@adhocteam.us',
  },
  {
    name: 'Lauren Rodriguez', hsesUsername: 'test.tta.lauren', hsesUserId: '51130', email: 'lauren.rodriguez@adhocteam.us',
  },
  {
    name: 'Maria Puhl', hsesUsername: 'test.tta.maria', hsesUserId: '51298', email: 'maria.puhl@adhocteam.us',
  },
  {
    name: 'Nathan Powell', hsesUsername: 'test.tta.nathan', hsesUserId: '51379', email: 'nathan.powell@adhocteam.us',
  },
  {
    name: 'Garrett Hill', hsesUsername: 'test.tta.garrett', hsesUserId: '51548', email: 'garrett.hill@adhocteam.us',
  },
  {
    name: 'C\'era Oliveira-Norris', hsesUsername: 'test.tta.c\'era', hsesUserId: '52075', email: 'c\'era.oliveira-norris@adhocteam.us',
  },
  {
    name: 'Crystal George', hsesUsername: 'test.tta.crystal', hsesUserId: '52057', email: 'crystal.george@adhocteam.us',
  },
  {
    name: 'Jon Pyers', hsesUsername: 'test.tta.jon', hsesUserId: '52829', email: 'jon.pyers@adhocteam.us',
  },
  {
    name: 'Patrick Deutsch', hsesUsername: 'test.tta.patrick', hsesUserId: '53137', email: 'patrick.deutsch@adhocteam.us',
  },
  {
    name: 'Does Notexist', hsesUsername: 'test.tta.doesnotexist', hsesUserId: '31337', email: 'does.notexist@adhocteam.us',
  },
];

const generateFakeEmail = () => 'no-send_'.concat(faker.internet.email());

// chr(92) represents the backslash (\) character in ASCII. This prevents JavaScript from
// interfering with the escape sequences in your SQL regular expression when you pass the
// query as a string in sequelize.query.
const processHtmlCreate = async () => sequelize.query(/* sql */`
  CREATE OR REPLACE FUNCTION "processHtml"(input TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
  DECLARE
      result TEXT;
      new_word TEXT;
  BEGIN
      IF input IS NULL OR input = '' THEN
          RETURN input;
      END IF;

      -- Replace each word with a random word
      result := regexp_replace(
          input,
          chr(92) || 'w+',
          (
              SELECT string_agg(word, ' ')
              FROM (
                  SELECT (ARRAY['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur'])[floor(random() * 6 + 1)::int] AS word
                  FROM generate_series(1, regexp_count(input, chr(92) || 'w+'))
              ) AS subquery
          ),
          'g'
      );

      RETURN result;
  END $$;
`);

const processHtmlDrop = async () => sequelize.query(/* sql */`
  DROP FUNCTION IF EXISTS "processHtml"(TEXT);
`);

const convertEmailsCreate = async () => sequelize.query(/* sql */`
  CREATE OR REPLACE FUNCTION "convertEmails"(emails TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
  DECLARE
      emails_array TEXT[];
      converted_emails TEXT[];
      email TEXT;
      converted_email TEXT;
      domain TEXT;
  BEGIN
      IF emails IS NULL OR emails = '' THEN
          RETURN emails;
      END IF;

      -- Split the emails string into an array
      emails_array := string_to_array(emails, ', ');

      -- Initialize the array for converted emails
      converted_emails := ARRAY[]::TEXT[];

      -- Iterate through each email
      FOREACH email IN ARRAY emails_array LOOP
          -- Perform the conversion using the provided SQL logic
          SELECT zu.new_row_data ->> 'email'
          INTO converted_email
          FROM "ZALUsers" zu
          WHERE zu.old_row_data ->> 'email' = email
          AND zu.dml_timestamp >= NOW() - INTERVAL '30 minutes'
          AND zu.dml_txid = lpad(txid_current()::text, 32, '0')::uuid;

          -- If the email was found and converted, add it to the array
          IF converted_email IS NOT NULL AND converted_email <> '' THEN
              converted_emails := array_append(converted_emails, converted_email);
          ELSE
              -- Generate a fake email if the email wasn't converted
              IF email LIKE '%@%' THEN
                  -- Extract domain from the email
                  domain := SPLIT_PART(email, '@', 2);

                  -- Generate the fake email using md5 of the original username
                  converted_email := 'no-send_' || md5(SPLIT_PART(email, '@', 1)) || '@' || (
                      SELECT email_domain FROM (
                          SELECT SPLIT_PART(e.email, '@', 2) AS email_domain
                          FROM "Users" e
                          WHERE NULLIF(TRIM(SPLIT_PART(e.email, '@', 2)), '') IS NOT NULL
                          ORDER BY RANDOM()
                          LIMIT 1
                      ) AS random_domain
                  );

                  -- Add the fake email to the array
                  converted_emails := array_append(converted_emails, converted_email);
              ELSE
                  converted_emails := array_append(converted_emails, '');
              END IF;
          END IF;
      END LOOP;

      -- Return the converted emails as a string
      RETURN array_to_string(converted_emails, ', ');
  END $$;
`);

const convertEmailsDrop = async () => sequelize.query(/* sql */`
  DROP FUNCTION IF EXISTS "convertEmails"(TEXT);
`);

export const convertName = (name, email) => {
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
      email: generateFakeEmail(),
    };
    transformedUsers.push(foundTransformedUser);
  }
  return foundTransformedUser;
};

const convertRecipientNameCreate = async () => sequelize.query(/* sql */`
  CREATE OR REPLACE FUNCTION "convertRecipientName"(recipients_grants TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
  DECLARE
      recipient_grants_array TEXT[];
      converted_recipients_grants TEXT[];
      recipient_grant TEXT;
      grant_number TEXT;  -- Renamed from 'grant' to 'grant_number'
      transformed_recipient_name TEXT;
      transformed_grant_number TEXT;
  BEGIN
      IF recipients_grants IS NULL THEN
          RETURN recipients_grants;
      END IF;

      -- Split the recipientsGrants string into an array
      recipient_grants_array := string_to_array(recipients_grants, chr(92) || 'n');

      -- Initialize the array for converted recipient-grant pairs
      converted_recipients_grants := ARRAY[]::TEXT[];

      -- Iterate through each recipient-grant pair
      FOREACH recipient_grant IN ARRAY recipient_grants_array LOOP
          -- Extract the grant number from the pair
          grant_number := split_part(recipient_grant, '|', 2);

          -- Remove leading and trailing whitespace
          grant_number := trim(grant_number);

          -- Perform the conversion using the provided SQL logic
          SELECT zgr.new_row_data ->> 'number', r.name
          INTO transformed_grant_number, transformed_recipient_name
          FROM "ZALGrants" zgr
          JOIN "Grants" gr ON zgr.data_id = gr.id
          JOIN "Recipients" r ON gr."recipientId" = r.id
          WHERE zgr.old_row_data ->> 'number' = grant_number
          AND zgr.dml_timestamp >= NOW() - INTERVAL '30 minutes'
          AND zgr.dml_txid = lpad(txid_current()::text, 32, chr(48))::uuid;  -- Use chr(48) for '0'

          -- Handle cases where no match was found
          IF transformed_grant_number IS NULL THEN
              transformed_grant_number := 'UnknownGrant';
          END IF;
          IF transformed_recipient_name IS NULL THEN
              transformed_recipient_name := 'Unknown Recipient';
          END IF;

          -- Construct the converted recipient-grant pair
          converted_recipients_grants := array_append(
              converted_recipients_grants,
              transformed_recipient_name || ' | ' || transformed_grant_number
          );
      END LOOP;

      -- Return the converted recipients-grants pairs as a string
      RETURN array_to_string(converted_recipients_grants, chr(92) || 'n');
  END $$;
`);

const convertRecipientNameDrop = async () => sequelize.query(/* sql */`
  DROP FUNCTION IF EXISTS "convertRecipientName"(TEXT);
`);

export const hideUsers = async (userIds) => {
  const ids = userIds || null;
  const whereClause = ids ? `WHERE "id" IN (${ids.join(', ')})` : '';

  // Save real users
  [realUsers] = await sequelize.query(/* sql */`
    SELECT "id", "email", "name"
    FROM "Users"
    ${whereClause};
  `);

  const usedHsesUsernames = new Set();
  const usedEmails = new Set();

  const fakeData = realUsers.map((user) => {
    let hsesUsername;
    let email;

    // Ensure hsesUsername is unique
    do {
      hsesUsername = faker.internet.email();
    } while (usedHsesUsernames.has(hsesUsername));
    usedHsesUsernames.add(hsesUsername);

    // Ensure email is unique
    do {
      email = `no-send_${faker.internet.email()}`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    return {
      id: user.id,
      hsesUsername,
      email,
      phoneNumber: faker.phone.phoneNumber(),
      name: faker.name.findName().replace(/'/g, ''),
    };
  });

  // // Convert fake data to JSON string for SQL
  // const fakeDataJSON = JSON.stringify(fakeData);

  // Update users using a CTE
  await sequelize.query(/* sql */`
    WITH fake_data AS (
      SELECT
        jsonb_array_elements(:fakeDataJSON::jsonb) AS data
    )
    UPDATE "Users"
    SET
      "hsesUsername" = data->>'hsesUsername',
      "email" = data->>'email',
      "phoneNumber" = data->>'phoneNumber',
      "name" = data->>'name'
    FROM fake_data
    WHERE "Users"."id" = (data->>'id')::int
    ${whereClause};
  `, {
    replacements: { fakeDataJSON: JSON.stringify(fakeData) },
  });

  // Retrieve transformed users
  [transformedUsers] = await sequelize.query(/* sql */`
    SELECT "id", "email", "name"
    FROM "Users"
    ${whereClause};
  `);
};

export const hideRecipientsGrants = async (recipientsGrants) => {
  // Parse recipientsGrants input
  const recipientsArray = recipientsGrants
    ? recipientsGrants.split('\n').map((el) => el.split('|')[0].trim())
    : null;
  const grantsArray = (recipientsArray && recipientsArray.length > 1)
    ? recipientsGrants.split('\n').map((el) => el.split('|')[1].trim())
    : null;
  const recipientWhere = recipientsArray
    ? `WHERE "name" ILIKE ANY(ARRAY[${recipientsArray.map((r) => `'${r}'`).join(', ')}])`
    : '';
  const grantWhere = grantsArray
    ? `WHERE "number" ILIKE ANY(ARRAY[${grantsArray.map((g) => `'${g}'}`).join(', ')}])`
    : '';

  // Generate fake data for recipients
  [realRecipients] = await sequelize.query(/* sql */`
    SELECT "id", "name"
    FROM "Recipients"
    ${recipientWhere};
  `);

  const fakeRecipientData = realRecipients.map((recipient) => ({
    id: recipient.id,
    name: faker.company.companyName().replace(/'/g, ''),
  }));

  // Generate fake data for grants
  const [grants] = await sequelize.query(/* sql */`
    SELECT "id", "number", "programSpecialistName", "programSpecialistEmail", "grantSpecialistName", "grantSpecialistEmail"
    FROM "Grants"
    ${grantWhere};
  `);

  const fakeGrantData = grants.map((grant) => {
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
    return {
      id: grant.id,
      number: newGrantNumber,
      programSpecialistName: programSpecialist.name,
      programSpecialistEmail: programSpecialist.email,
      grantSpecialistName: grantSpecialist.name,
      grantSpecialistEmail: grantSpecialist.email,
    };
  });

  // Convert fake data to JSON strings for SQL
  const fakeRecipientDataJSON = JSON.stringify(fakeRecipientData);
  const fakeGrantDataJSON = JSON.stringify(fakeGrantData);

  // Update recipients using a CTE
  await sequelize.query(/* sql */`
    WITH fake_recipients AS (
      SELECT
        jsonb_array_elements('${fakeRecipientDataJSON}'::jsonb) AS data
    )
    UPDATE "Recipients"
    SET
      "name" = data->>'name'
    FROM fake_recipients
    WHERE "Recipients"."id" = (data->>'id')::int;
  `);

  // Update grants using a CTE
  await sequelize.query(/* sql */`
    WITH fake_grants AS (
      SELECT
        jsonb_array_elements('${fakeGrantDataJSON}'::jsonb) AS data
    )
    UPDATE "Grants"
    SET
      "number" = data->>'number',
      "programSpecialistName" = data->>'programSpecialistName',
      "programSpecialistEmail" = data->>'programSpecialistEmail',
      "grantSpecialistName" = data->>'grantSpecialistName',
      "grantSpecialistEmail" = data->>'grantSpecialistEmail'
    FROM fake_grants
    WHERE "Grants"."id" = (data->>'id')::int;
  `);

  // Bulk update MonitoringReviewGrantee, MonitoringClassSummary, and GrantNumberLink
  await sequelize.query(/* sql */`
    -- 1. Disable the foreign key constraints
    ALTER TABLE "MonitoringReviewGrantees" DROP CONSTRAINT "MonitoringReviewGrantees_grantNumber_fkey";
    ALTER TABLE "MonitoringClassSummaries" DROP CONSTRAINT "MonitoringClassSummaries_grantNumber_fkey";

    -- 2. Perform the data modifications
    -- Update MonitoringReviewGrantee
    UPDATE "MonitoringReviewGrantees" mrg
    SET "grantNumber" = gr.number
    FROM "GrantNumberLinks" gnl
    JOIN "Grants" gr ON gnl."grantId" = gr.id
    AND gnl."grantNumber" != gr.number
    WHERE mrg."grantNumber" = gnl."grantNumber";

    -- Update MonitoringClassSummary
    UPDATE "MonitoringClassSummaries" mcs
    SET "grantNumber" = gr.number
    FROM "GrantNumberLinks" gnl
    JOIN "Grants" gr ON gnl."grantId" = gr.id
    AND gnl."grantNumber" != gr.number
    WHERE mcs."grantNumber" = gnl."grantNumber";

    -- Update GrantNumberLink to reflect the new grant numbers
    UPDATE "GrantNumberLinks" gnl
    SET "grantNumber" = gr.number
    FROM "Grants" gr
    WHERE gnl."grantId" = gr.id
    AND gnl."grantNumber" != gr.number;

    -- 3. Re-add the foreign key constraints with NOT VALID
    ALTER TABLE "MonitoringReviewGrantees" ADD CONSTRAINT "MonitoringReviewGrantees_grantNumber_fkey"
    FOREIGN KEY ("grantNumber") REFERENCES "GrantNumberLinks"("grantNumber") NOT VALID;

    ALTER TABLE "MonitoringClassSummaries" ADD CONSTRAINT "MonitoringClassSummaries_grantNumber_fkey"
    FOREIGN KEY ("grantNumber") REFERENCES "GrantNumberLinks"("grantNumber") NOT VALID;

    -- 4. Revalidate the foreign key constraints
    ALTER TABLE "MonitoringReviewGrantees" VALIDATE CONSTRAINT "MonitoringReviewGrantees_grantNumber_fkey";
    ALTER TABLE "MonitoringClassSummaries" VALIDATE CONSTRAINT "MonitoringClassSummaries_grantNumber_fkey";
  `);
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
      role: sequelize.literal('ARRAY[\'Central Office\']::"enum_Users_role"[]'),
      hsesAuthorities: ['ROLE_FEDERAL'],
      lastLogin: new Date(),
    };
    if (user) {
      id = user.id;
      userPromises.push(user.update(newUser, { individualHooks: true }));
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

export const truncateAuditTables = async () => {
  const tablesToTruncate = await sequelize.query(`
    SELECT table_name FROM information_schema.tables
    WHERE
      table_name like 'ZAL%' AND
      table_name not in ('ZALDDL', 'ZALZADescriptor', 'ZALZAFilter')
  `, { raw: true });

  for await (const table of tablesToTruncate) {
    await sequelize.query(`ALTER TABLE "${table}" DISABLE TRIGGER all`);
    await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY`);
    await sequelize.query(`ALTER TABLE "${table}" ENABLE TRIGGER all`);
  }
};

export const processFiles = async () => sequelize.query(/* sql */`
  UPDATE "Files"
  SET "originalFileName" =
    CONCAT(
      SUBSTRING(md5(random()::text), 1, 8), -- Random file name
      SUBSTRING("originalFileName" FROM '\\..*$') -- Original extension
    )
  WHERE "originalFileName" IS NOT NULL;
`);

export const processActivityReports = async (where) => sequelize.query(/* sql */`
  UPDATE "ActivityReports"
  SET
    -- "managerNotes" = "processHtml"("managerNotes"),
    "additionalNotes" = "processHtml"("additionalNotes"),
    "context" = "processHtml"("context"),
    "imported" = CASE
      WHEN "imported" IS NOT NULL THEN
        jsonb_set("imported", '{additionalNotesForThisActivity}', to_jsonb("processHtml"("imported"->>'additionalNotesForThisActivity')), true)
        || jsonb_set("imported", '{cdiGranteeName}', to_jsonb("processHtml"("imported"->>'cdiGranteeName')), true)
        || jsonb_set("imported", '{contextForThisActivity}', to_jsonb("processHtml"("imported"->>'contextForThisActivity')), true)
        || jsonb_set("imported", '{createdBy}', to_jsonb("convertEmails"("imported"->>'createdBy')), true)
        || jsonb_set("imported", '{granteeFollowUpTasksObjectives}', to_jsonb("processHtml"("imported"->>'granteeFollowUpTasksObjectives')), true)
        || jsonb_set("imported", '{granteeName}', to_jsonb("convertRecipientName"("imported"->>'granteeName')), true)
        || jsonb_set("imported", '{manager}', to_jsonb("convertEmails"("imported"->>'manager')), true)
        || jsonb_set("imported", '{modifiedBy}', to_jsonb("convertEmails"("imported"->>'modifiedBy')), true)
        || jsonb_set("imported", '{otherSpecialists}', to_jsonb("convertEmails"("imported"->>'otherSpecialists')), true)
        || jsonb_set("imported", '{specialistFollowUpTasksObjectives}', to_jsonb("processHtml"("imported"->>'specialistFollowUpTasksObjectives')), true)
      ELSE
        "imported"
    END
  WHERE 1 = 1
    ${where};
`);

const processData = async (mockReport) => sequelize.transaction(async () => {
  const activityReportId = mockReport ? mockReport.id : null;
  const where = activityReportId ? `AND id = ${activityReportId}` : '';
  const userIds = mockReport ? [3000, 3001, 3002, 3003] : null;

  const recipientsGrants = mockReport ? mockReport.imported.granteeName : null;

  await processHtmlCreate();
  await convertEmailsCreate();
  await convertRecipientNameCreate();

  // Hide users
  await hideUsers(userIds);

  // Hide recipients and grants
  await hideRecipientsGrants(recipientsGrants);

  await processActivityReports(where);

  await processFiles();

  await bootstrapUsers();

  // Delete from RequestErrors
  await RequestErrors.destroy({
    where: {},
    truncate: true,
  });

  await processHtmlDrop();
  await convertEmailsDrop();
  await convertRecipientNameDrop();
  return truncateAuditTables();
});

export default processData;
