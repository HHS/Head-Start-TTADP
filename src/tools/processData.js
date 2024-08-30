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

// Define constants representing different permission scopes that can be assigned to users
const SITE_ACCESS = 1;
const ADMIN = 2;
const READ_WRITE_REPORTS = 3;
const READ_REPORTS = 4;
const APPROVE_REPORTS = 5;

/**
 * The processData script is responsible for anonymizing sensitive user data, including names, emails, recipient information, grant details, and certain HTML fields.
 * This anonymization ensures that the resulting database, which can then be restored in non-production environments, preserves existing relationships and non-personally identifiable information (non-PII) data.
 */

// Arrays to hold the original real user data and the transformed anonymized user data
let realUsers = [];
let transformedUsers = [];
let realRecipients = [];

// Predefined list of users from HSES (Head Start Enterprise System) with their details such as name, username, user ID, and email
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

// A helper function to generate a fake email address by prefixing 'no-send_' to a randomly generated email using the faker library
const generateFakeEmail = () => 'no-send_'.concat(faker.internet.email());

// chr(92) represents the backslash (\) character in ASCII. This prevents JavaScript from
// interfering with the escape sequences in your SQL regular expression when you pass the
// query as a string in sequelize.query.

// Function to create a PL/pgSQL function in the PostgreSQL database that processes HTML content by replacing words with randomly generated words
const processHtmlCreate = async () => sequelize.query(/* sql */`
  CREATE OR REPLACE FUNCTION "processHtml"(input TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
  DECLARE
      result TEXT;
      new_word TEXT;
  BEGIN
      IF input IS NULL OR input = '' THEN
          RETURN input;
      END IF;

      -- Replace each word in the input with a random word from a predefined list
      result := regexp_replace(
          input,
          chr(92) || 'w+',  -- Match words using a regular expression
          (
              SELECT string_agg(word, ' ')
              FROM (
                  SELECT (ARRAY['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur'])[floor(random() * 6 + 1)::int] AS word
                  FROM generate_series(1, regexp_count(input, chr(92) || 'w+'))
              ) AS subquery
          ),
          'g'  -- Global flag to replace all occurrences
      );

      RETURN result;
  END $$;
`);

// Function to drop the "processHtml" function from the PostgreSQL database if it exists
const processHtmlDrop = async () => sequelize.query(/* sql */`
  DROP FUNCTION IF EXISTS "processHtml"(TEXT);
`);

// Function to create a PL/pgSQL function in the PostgreSQL database that converts email addresses by either finding a corresponding anonymized email or generating a fake one
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

      -- Split the input emails string into an array of individual email addresses
      emails_array := string_to_array(emails, ', ');

      -- Initialize the array to store the converted (anonymized) emails
      converted_emails := ARRAY[]::TEXT[];

      -- Iterate through each email in the array
      FOREACH email IN ARRAY emails_array LOOP
          -- Try to find a corresponding anonymized email from the ZALUsers table within the last 30 minutes and with the current transaction ID
          SELECT zu.new_row_data ->> 'email'
          INTO converted_email
          FROM "ZALUsers" zu
          WHERE zu.old_row_data ->> 'email' = email
          AND zu.dml_timestamp >= NOW() - INTERVAL '30 minutes'
          AND zu.dml_txid = lpad(txid_current()::text, 32, '0')::uuid;

          -- If a converted email is found, add it to the array
          IF converted_email IS NOT NULL AND converted_email <> '' THEN
              converted_emails := array_append(converted_emails, converted_email);
          ELSE
              -- If no converted email is found, generate a fake email address
              IF email LIKE '%@%' THEN
                  -- Extract the domain from the email
                  domain := SPLIT_PART(email, '@', 2);

                  -- Generate the fake email using the md5 hash of the original username and a random domain from the Users table
                  converted_email := 'no-send_' || md5(SPLIT_PART(email, '@', 1)) || '@' || (
                      SELECT email_domain FROM (
                          SELECT SPLIT_PART(e.email, '@', 2) AS email_domain
                          FROM "Users" e
                          WHERE NULLIF(TRIM(SPLIT_PART(e.email, '@', 2)), '') IS NOT NULL
                          ORDER BY RANDOM()
                          LIMIT 1
                      ) AS random_domain
                  );

                  -- Add the generated fake email to the array
                  converted_emails := array_append(converted_emails, converted_email);
              ELSE
                  -- If the email is not valid, add an empty string to the array
                  converted_emails := array_append(converted_emails, '');
              END IF;
          END IF;
      END LOOP;

      -- Return the array of converted emails as a comma-separated string
      RETURN array_to_string(converted_emails, ', ');
  END $$;
`);

// Function to drop the "convertEmails" function from the PostgreSQL database if it exists
const convertEmailsDrop = async () => sequelize.query(/* sql */`
  DROP FUNCTION IF EXISTS "convertEmails"(TEXT);
`);

// Function to convert a user's name and email to anonymized data, ensuring consistent anonymization across the dataset
export const convertName = (name, email) => {
  if (!name) {
    return { name, email };
  }
  const additionalId = 99999;  // Arbitrary ID to use for users not found in the realUsers array
  let foundUser = realUsers.find((user) => user.email === email);

  // If the user is not found and the email contains '@', add the user to the realUsers array
  if (!foundUser && email.includes('@')) {
    foundUser = { id: additionalId + 1, name, email };
    realUsers.push(foundUser);
  }

  // Find the corresponding transformed (anonymized) user data
  let foundTransformedUser = transformedUsers.find((user) => user.id === foundUser.id);
  if (!foundTransformedUser) {
    // If the transformed user is not found, create a new transformed user with a fake name and email
    foundTransformedUser = {
      id: foundUser.id,
      name: faker.name.findName(),  // Generate a fake name
      email: generateFakeEmail(),   // Generate a fake email
    };
    transformedUsers.push(foundTransformedUser);
  }
  return foundTransformedUser;
};

// Function to create a PL/pgSQL function in the PostgreSQL database that converts recipient names and grant numbers to anonymized data
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

      -- Split the recipients_grants string into an array of recipient-grant pairs
      recipient_grants_array := string_to_array(recipients_grants, chr(92) || 'n');

      -- Initialize the array to store the converted recipient-grant pairs
      converted_recipients_grants := ARRAY[]::TEXT[];

      -- Iterate through each recipient-grant pair
      FOREACH recipient_grant IN ARRAY recipient_grants_array LOOP
          -- Extract the grant number from the pair
          grant_number := split_part(recipient_grant, '|', 2);

          -- Remove leading and trailing whitespace from the grant number
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

          -- Handle cases where no match was found and assign default values
          IF transformed_grant_number IS NULL THEN
              transformed_grant_number := 'UnknownGrant';
          END IF;
          IF transformed_recipient_name IS NULL THEN
              transformed_recipient_name := 'Unknown Recipient';
          END IF;

          -- Construct the converted recipient-grant pair and add it to the array
          converted_recipients_grants := array_append(
              converted_recipients_grants,
              transformed_recipient_name || ' | ' || transformed_grant_number
          );
      END LOOP;

      -- Return the converted recipient-grant pairs as a string
      RETURN array_to_string(converted_recipients_grants, chr(92) || 'n');
  END $$;
`);

// Function to drop the "convertRecipientName" function from the PostgreSQL database if it exists
const convertRecipientNameDrop = async () => sequelize.query(/* sql */`
  DROP FUNCTION IF EXISTS "convertRecipientName"(TEXT);
`);

// Function to anonymize user data by replacing names, emails, and other details with generated fake data
export const hideUsers = async (userIds) => {
  // Prepare the WHERE clause for the query based on the provided user IDs, if any
  const ids = userIds || null;
  const whereClause = ids ? `WHERE "id" IN (${ids.join(', ')})` : '';

  // Query the database to retrieve real user data based on the WHERE clause
  [realUsers] = await sequelize.query(/* sql */`
    SELECT "id", "email", "name"
    FROM "Users"
    ${whereClause};
  `);

  const usedHsesUsernames = new Set();
  const usedEmails = new Set();

  // Generate anonymized data for each user
  const fakeData = realUsers.map((user) => {
    let hsesUsername;
    let email;

    // Ensure that the generated HSES username is unique
    do {
      hsesUsername = faker.internet.email();
    } while (usedHsesUsernames.has(hsesUsername));
    usedHsesUsernames.add(hsesUsername);

    // Ensure that the generated email is unique
    do {
      email = `no-send_${faker.internet.email()}`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    return {
      id: user.id,
      hsesUsername,
      email,
      phoneNumber: faker.phone.phoneNumber(),  // Generate a fake phone number
      name: faker.name.findName().replace(/'/g, ''),  // Generate a fake name and remove any single quotes
    };
  });

  // Update the Users table in the database with the anonymized data using a Common Table Expression (CTE)
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

  // Retrieve the transformed (anonymized) user data from the Users table for further processing
  [transformedUsers] = await sequelize.query(/* sql */`
    SELECT "id", "email", "name"
    FROM "Users"
    ${whereClause};
  `);
};

// Function to anonymize recipient and grant data by replacing names and grant numbers with generated fake data
export const hideRecipientsGrants = async (recipientsGrants) => {
  // Parse the recipientsGrants input string into arrays of recipients and grants
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

  // Query the database to retrieve real recipient data based on the WHERE clause
  [realRecipients] = await sequelize.query(/* sql */`
    SELECT "id", "name"
    FROM "Recipients"
    ${recipientWhere};
  `);

  // Generate anonymized data for each recipient
  const fakeRecipientData = realRecipients.map((recipient) => ({
    id: recipient.id,
    name: faker.company.companyName().replace(/'/g, ''),  // Generate a fake company name and remove any single quotes
  }));

  // Query the database to retrieve real grant data based on the WHERE clause
  const [grants] = await sequelize.query(/* sql */`
    SELECT "id", "number", "programSpecialistName", "programSpecialistEmail", "grantSpecialistName", "grantSpecialistEmail"
    FROM "Grants"
    ${grantWhere};
  `);

  // Generate anonymized data for each grant
  const fakeGrantData = grants.map((grant) => {
    // Anonymize the program specialist's name and email
    const programSpecialist = convertName(
      grant.programSpecialistName,
      grant.programSpecialistEmail,
    );
    // Anonymize the grant specialist's name and email
    const grantSpecialist = convertName(
      grant.grantSpecialistName,
      grant.grantSpecialistEmail,
    );
    // Generate a new grant number with a random animal type and trailing ID
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

  // Convert the anonymized recipient and grant data into JSON strings for SQL processing
  const fakeRecipientDataJSON = JSON.stringify(fakeRecipientData);
  const fakeGrantDataJSON = JSON.stringify(fakeGrantData);

  // Update the Recipients table in the database with the anonymized recipient data using a Common Table Expression (CTE)
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

  // Update the Grants table in the database with the anonymized grant data using a Common Table Expression (CTE)
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

  // Bulk update related tables MonitoringReviewGrantee, MonitoringClassSummary, and GrantNumberLink with the new anonymized grant numbers
  await sequelize.query(/* sql */`
    -- 1. Disable the foreign key constraints temporarily to allow data modification
    ALTER TABLE "MonitoringReviewGrantees" DROP CONSTRAINT "MonitoringReviewGrantees_grantNumber_fkey";
    ALTER TABLE "MonitoringClassSummaries" DROP CONSTRAINT "MonitoringClassSummaries_grantNumber_fkey";

    -- 2. Perform the data modifications
    -- Update MonitoringReviewGrantee table with new grant numbers
    UPDATE "MonitoringReviewGrantees" mrg
    SET "grantNumber" = gr.number
    FROM "GrantNumberLinks" gnl
    JOIN "Grants" gr ON gnl."grantId" = gr.id
    AND gnl."grantNumber" != gr.number
    WHERE mrg."grantNumber" = gnl."grantNumber";

    -- Update MonitoringClassSummary table with new grant numbers
    UPDATE "MonitoringClassSummaries" mcs
    SET "grantNumber" = gr.number
    FROM "GrantNumberLinks" gnl
    JOIN "Grants" gr ON gnl."grantId" = gr.id
    AND gnl."grantNumber" != gr.number
    WHERE mcs."grantNumber" = gnl."grantNumber";

    -- Update GrantNumberLink table to reflect the new grant numbers
    UPDATE "GrantNumberLinks" gnl
    SET "grantNumber" = gr.number
    FROM "Grants" gr
    WHERE gnl."grantId" = gr.id
    AND gnl."grantNumber" != gr.number;

    -- 3. Re-add the foreign key constraints with NOT VALID to allow revalidation later
    ALTER TABLE "MonitoringReviewGrantees" ADD CONSTRAINT "MonitoringReviewGrantees_grantNumber_fkey"
    FOREIGN KEY ("grantNumber") REFERENCES "GrantNumberLinks"("grantNumber") NOT VALID;

    ALTER TABLE "MonitoringClassSummaries" ADD CONSTRAINT "MonitoringClassSummaries_grantNumber_fkey"
    FOREIGN KEY ("grantNumber") REFERENCES "GrantNumberLinks"("grantNumber") NOT VALID;

    -- 4. Revalidate the foreign key constraints to ensure data integrity
    ALTER TABLE "MonitoringReviewGrantees" VALIDATE CONSTRAINT "MonitoringReviewGrantees_grantNumber_fkey";
    ALTER TABLE "MonitoringClassSummaries" VALIDATE CONSTRAINT "MonitoringClassSummaries_grantNumber_fkey";
  `);
};

// Function to generate a set of permissions for a user based on their user ID and predefined permission scopes
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

  // Loop to generate READ_REPORTS permissions for regions 1 through 12
  for (let region = 1; region < 13; region++) {
    permissionsArray.push({
      userId: id,
      regionId: region,
      scopeId: READ_REPORTS,
    });
  }

  return permissionsArray;
};

// Function to bootstrap HSES users into the system by either creating or updating them, and assigning appropriate permissions
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
      // If the user already exists, update their details
      userPromises.push(user.update(newUser, { individualHooks: true }));
      // Assign permissions to the user
      for (const permission of givePermissions(id)) {
        userPromises.push(Permission.findOrCreate({ where: permission }));
      }
    } else {
      // If the user does not exist, create a new user
      const createdUser = await User.create(newUser);
      if (createdUser) {
        // Assign permissions to the newly created user
        for (const permission of givePermissions(createdUser.id)) {
          userPromises.push(Permission.findOrCreate({ where: permission }));
        }
      }
    }

    await Promise.all(userPromises);
  }
};

// Function to truncate (empty) audit tables in the database while disabling and re-enabling triggers
export const truncateAuditTables = async () => {
  // Query the database to find all audit tables (tables starting with 'ZAL') except for specific ones that should not be truncated
  const tablesToTruncate = await sequelize.query(`
    SELECT table_name FROM information_schema.tables
    WHERE
      table_name like 'ZAL%' AND
      table_name not in ('ZALDDL', 'ZALZADescriptor', 'ZALZAFilter')
  `, { raw: true });

  // Iterate through each table and perform truncation
  for await (const table of tablesToTruncate) {
    // Disable triggers before truncating the table
    await sequelize.query(`ALTER TABLE "${table}" DISABLE TRIGGER all`);
    // Truncate the table and restart its identity sequence
    await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY`);
    // Re-enable triggers after truncating the table
    await sequelize.query(`ALTER TABLE "${table}" ENABLE TRIGGER all`);
  }
};

// Function to anonymize file names by replacing them with randomly generated file names while preserving their original extensions
export const processFiles = async () => sequelize.query(/* sql */`
  UPDATE "Files"
  SET "originalFileName" =
    CONCAT(
      SUBSTRING(md5(random()::text), 1, 8), -- Generate a random file name using MD5 hash
      SUBSTRING("originalFileName" FROM '\\..*$') -- Preserve the original file extension
    )
  WHERE "originalFileName" IS NOT NULL;
`);

// Function to process and anonymize sensitive data in Activity Reports by replacing specific fields with generated fake data
export const processActivityReports = async (where) => sequelize.query(/* sql */`
  UPDATE "ActivityReports"
  SET
    -- "managerNotes" = "processHtml"("managerNotes"),  // Anonymize manager notes (commented out)
    "additionalNotes" = "processHtml"("additionalNotes"),  // Anonymize additional notes
    "context" = "processHtml"("context"),  // Anonymize context
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
    ${where};  // Apply the WHERE clause if provided to limit the scope of the update
`);

// Main function to orchestrate the entire anonymization process, including creating and dropping database functions, hiding users, recipients, and grants, processing activity reports and files, and truncating audit tables
const processData = async (mockReport) => sequelize.transaction(async () => {
  // If a mockReport is provided, extract the activity report ID and relevant data
  const activityReportId = mockReport ? mockReport.id : null;
  const where = activityReportId ? `AND id = ${activityReportId}` : '';
  const userIds = mockReport ? [3000, 3001, 3002, 3003] : null;
  const recipientsGrants = mockReport ? mockReport.imported.granteeName : null;

  // Create the necessary database functions for data processing
  await processHtmlCreate();
  await convertEmailsCreate();
  await convertRecipientNameCreate();

  // Anonymize user data
  await hideUsers(userIds);

  // Anonymize recipient and grant data
  await hideRecipientsGrants(recipientsGrants);

  // Anonymize activity reports
  await processActivityReports(where);

  // Anonymize file names
  await processFiles();

  // Bootstrap HSES users and assign permissions
  await bootstrapUsers();

  // Delete all records from the RequestErrors table
  await RequestErrors.destroy({
    where: {},
    truncate: true,
  });

  // Drop the database functions used for data processing
  await processHtmlDrop();
  await convertEmailsDrop();
  await convertRecipientNameDrop();

  // Truncate audit tables
  return truncateAuditTables();
});

// Export the main processData function as the default export of the module
export default processData;
