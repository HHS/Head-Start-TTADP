const { SCOPE_IDS } = require('@ttahub/common');

const {
  READ_WRITE_TRAINING_REPORTS,
  POC_TRAINING_REPORTS,
  READ_REPORTS,
} = SCOPE_IDS;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const readWriteTrainingReports = [
      {
        userId: 1, // Hermoine Granger - Admin
        regionId: 3,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 5, // Cucumber User - Creator/Owner
        regionId: 3,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 4, // Ron Weasley - Collaborator
        regionId: 3,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
    ];

    const pocTrainingReports = [
      {
        userId: 6, // Larry Botter - POC
        regionId: 3,
        scopeId: POC_TRAINING_REPORTS,
      },
    ];

    const readReportsPermissions = [
      {
        userId: 5, // Cucumber User - Creator/Owner
        regionId: 3,
        scopeId: READ_REPORTS,
      },
      {
        userId: 4, // Ron Weasley - Collaborator
        regionId: 3,
        scopeId: READ_REPORTS,
      },
    ];

    await queryInterface.bulkInsert('Permissions', readWriteTrainingReports, {});
    await queryInterface.bulkInsert('Permissions', pocTrainingReports, {});
    await queryInterface.bulkInsert('Permissions', readReportsPermissions, {});

    await queryInterface.sequelize.query(`
    -- ========================================
    -- SCENARIO 1: Regional TTA Hosted Event (no National Centers)
    -- POC has no involvement in sessions
    -- ========================================

    -- Event 1.1: Not started
    -- Owner=5 (Cucumber User), Collaborators=[3] (Harry Potter), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3]::INTEGER[], 3,
      CAST('{"eventId":"R03-TTA-24-2001","eventName":"Regional TTA Event - Not Started","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Infants and Toddlers (ages birth to 3)"],"vision":"Leadership and Governance","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"Not started"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-2001","Event Title":"Regional TTA Event - Not Started","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Infants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"Leadership and Governance","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- Event 1.2: In progress (with session)
    -- Owner=5 (Cucumber User), Collaborators=[3] (Harry Potter), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3]::INTEGER[], 3,
      CAST('{"eventId":"R03-TTA-24-2002","eventName":"Regional TTA Event - In Progress","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Infants and Toddlers (ages birth to 3)"],"vision":"Leadership and Governance","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"In progress"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-2002","Event Title":"Regional TTA Event - In Progress","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Infants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"Leadership and Governance","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- Event 1.3: Suspended
    -- Owner=5 (Cucumber User), Collaborators=[3] (Harry Potter), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3]::INTEGER[], 3,
      CAST('{"eventId":"R03-TTA-24-2003","eventName":"Regional TTA Event - Suspended","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Infants and Toddlers (ages birth to 3)"],"vision":"Leadership and Governance","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"Suspended"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-2003","Event Title":"Regional TTA Event - Suspended","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Infants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"Leadership and Governance","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- Event 1.4: Complete (with session)
    -- Owner=5 (Cucumber User), Collaborators=[3] (Harry Potter), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3]::INTEGER[], 3,
      CAST('{"eventId":"R03-TTA-24-2004","eventName":"Regional TTA Event - Complete","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Infants and Toddlers (ages birth to 3)"],"vision":"Leadership and Governance","creator":"cucumber@hogwarts.com","eventSubmitted":true,"status":"Complete"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-2004","Event Title":"Regional TTA Event - Complete","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Infants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"Leadership and Governance","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- ========================================
    -- SCENARIO 2: Regional PD Event (with NC) - All Facilitation Types
    -- POC has full involvement in sessions
    -- Consolidated: One "In Progress" event with 3 sessions (NC, Regional, Both)
    -- ========================================

    -- Event 2.1: Not started
    -- Owner=5 (Cucumber User), Collaborators=[3,4] (Harry Potter, Ron Weasley), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3,4]::INTEGER[], 3,
      CAST('{"eventId":"R03-PD-24-3001","eventName":"Regional PD Event - Not Started","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Preschool Children (ages 3-5)"],"vision":"School Readiness","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"Not started"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-3001","Event Title":"Regional PD Event - Not Started","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Preschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"School Readiness","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- Event 2.2: In progress (with 3 sessions: NC, Regional, Both)
    -- Owner=5 (Cucumber User), Collaborators=[3,4] (Harry Potter, Ron Weasley), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3,4]::INTEGER[], 3,
      CAST('{"eventId":"R03-PD-24-3002","eventName":"Regional PD Event - In Progress","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Preschool Children (ages 3-5)"],"vision":"School Readiness","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"In progress"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-3002","Event Title":"Regional PD Event - In Progress","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Preschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"School Readiness","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- Event 2.3: Suspended
    -- Owner=5 (Cucumber User), Collaborators=[3,4] (Harry Potter, Ron Weasley), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3,4]::INTEGER[], 3,
      CAST('{"eventId":"R03-PD-24-3003","eventName":"Regional PD Event - Suspended","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Preschool Children (ages 3-5)"],"vision":"School Readiness","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"Suspended"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-3003","Event Title":"Regional PD Event - Suspended","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Preschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"School Readiness","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- Event 2.4: Complete (with 3 sessions: NC, Regional, Both)
    -- Owner=5 (Cucumber User), Collaborators=[3,4] (Harry Potter, Ron Weasley), POCs=[6] (Larry Botter)
    INSERT INTO "EventReportPilots" (
      "ownerId", "collaboratorIds", "regionId", "data", "imported", "createdAt", "updatedAt", "pocIds"
    ) VALUES (
      5, ARRAY[3,4]::INTEGER[], 3,
      CAST('{"eventId":"R03-PD-24-3004","eventName":"Regional PD Event - Complete","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","targetPopulations":["Preschool Children (ages 3-5)"],"vision":"School Readiness","creator":"cucumber@hogwarts.com","eventSubmitted":true,"status":"Complete"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-3004","Event Title":"Regional PD Event - Complete","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Target Population(s)":"Preschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"School Readiness","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(), NOW(), ARRAY[6]::INTEGER[]
    );

    -- ========================================
    -- SESSIONS: Create sessions for In Progress and Complete events
    -- ========================================

    -- Session 1.1: Scenario 1 - In Progress (Regional TTA facilitation)
    -- Approver: Christopher Chant (User 7, Regional Manager)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 7,
      CAST('{"sessionName":"TTA Session - In Progress","reviewStatus":"draft","startDate":"2024-02-01","endDate":"2024-02-01","duration":3,"deliveryMethod":"virtual","context":"Leadership development session","objective":"Improve leadership skills","numberOfParticipants":20,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1234,"label":"Example Recipient 1"}],"objectiveTopics":["Leadership","Governance"],"objectiveTrainers":["Regional TTA Team"],"participants":["Teacher","Coach"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-TTA-24-2002';

    -- Session 1.2: Scenario 1 - Complete (Regional TTA facilitation)
    -- Approver: Christopher Chant (User 7, Regional Manager)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 7,
      CAST('{"sessionName":"TTA Session - Complete","reviewStatus":"complete","startDate":"2024-01-15","endDate":"2024-01-15","duration":3,"deliveryMethod":"virtual","context":"Leadership development session","objective":"Improve leadership skills","numberOfParticipants":20,"status":"Complete","ownerComplete":true,"pocComplete":true,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1234,"label":"Example Recipient 1"}],"objectiveTopics":["Leadership","Governance"],"objectiveTrainers":["Regional TTA Team"],"participants":["Teacher","Coach"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-TTA-24-2004';

    -- Session 2.1a: Scenario 2 - In Progress (National Center facilitation)
    -- Approver: Luz Noceda (User 8, National Center)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 8,
      CAST('{"sessionName":"NC Trainers Session - In Progress","reviewStatus":"draft","startDate":"2024-02-10","endDate":"2024-02-10","duration":4,"deliveryMethod":"in-person","context":"School readiness with NC support","objective":"Master school readiness strategies","numberOfParticipants":25,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Assessment"],"objectiveTrainers":["NCQTL"],"participants":["Teacher","Coach"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-PD-24-3002';

    -- Session 2.1b: Scenario 2 - In Progress (Regional facilitation)
    -- Approver: Christopher Chant (User 7, Regional Manager)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 7,
      CAST('{"sessionName":"Regional Trainers Session - In Progress","reviewStatus":"draft","startDate":"2024-02-15","endDate":"2024-02-15","duration":3.5,"deliveryMethod":"virtual","context":"Family engagement strategies","objective":"Enhance family engagement","numberOfParticipants":30,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["Family Engagement","Communication"],"objectiveTrainers":["Regional TTA Team"],"participants":["Family Service Worker","Manager"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-PD-24-3002';

    -- Session 2.1c: Scenario 2 - In Progress (Both NC and Regional facilitation)
    -- Approver: Luz Noceda (User 8, National Center - NC involvement means NC approver)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 8,
      CAST('{"sessionName":"Both Trainers Session - In Progress","reviewStatus":"draft","startDate":"2024-02-20","endDate":"2024-02-20","duration":5,"deliveryMethod":"hybrid","context":"Comprehensive assessment training","objective":"Master assessment techniques","numberOfParticipants":35,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["Child Screening","Assessment","Development"],"objectiveTrainers":["Regional TTA Team","NCQTL"],"participants":["Teacher","Coach","Education Manager"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-PD-24-3002';

    -- Session 2.2a: Scenario 2 - Complete (National Center facilitation)
    -- Approver: Luz Noceda (User 8, National Center)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 8,
      CAST('{"sessionName":"NC Trainers Session - Complete","reviewStatus":"complete","startDate":"2024-01-25","endDate":"2024-01-25","duration":4,"deliveryMethod":"in-person","context":"School readiness with NC support","objective":"Master school readiness strategies","numberOfParticipants":25,"status":"Complete","ownerComplete":true,"pocComplete":true,"regionId":3,"facilitation":"national_center","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Assessment"],"objectiveTrainers":["NCQTL"],"participants":["Teacher","Coach"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-PD-24-3004';

    -- Session 2.2b: Scenario 2 - Complete (Regional facilitation)
    -- Approver: Christopher Chant (User 7, Regional Manager)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 7,
      CAST('{"sessionName":"Regional Trainers Session - Complete","reviewStatus":"complete","startDate":"2024-01-30","endDate":"2024-01-30","duration":3.5,"deliveryMethod":"virtual","context":"Family engagement strategies","objective":"Enhance family engagement","numberOfParticipants":30,"status":"Complete","ownerComplete":true,"pocComplete":true,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["Family Engagement","Communication"],"objectiveTrainers":["Regional TTA Team"],"participants":["Family Service Worker","Manager"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-PD-24-3004';

    -- Session 2.2c: Scenario 2 - Complete (Both NC and Regional facilitation)
    -- Approver: Luz Noceda (User 8, National Center - NC involvement means NC approver)
    INSERT INTO "SessionReportPilots" ("eventId", "approverId", "data", "createdAt", "updatedAt")
    SELECT id, 8,
      CAST('{"sessionName":"Both Trainers Session - Complete","reviewStatus":"complete","startDate":"2024-02-05","endDate":"2024-02-05","duration":5,"deliveryMethod":"hybrid","context":"Comprehensive assessment training","objective":"Master assessment techniques","numberOfParticipants":35,"status":"Complete","ownerComplete":true,"pocComplete":true,"regionId":3,"facilitation":"both","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["Child Screening","Assessment","Development"],"objectiveTrainers":["Regional TTA Team","NCQTL"],"participants":["Teacher","Coach","Education Manager"],"additionalStates":[]}' AS JSONB),
      NOW(), NOW()
    FROM "EventReportPilots" WHERE data->>'eventId' = 'R03-PD-24-3004';
  `);
  },

  async down(queryInterface) {
    // Delete session reports first (due to foreign key constraints)
    await queryInterface.sequelize.query(`
      DELETE FROM "SessionReportPilots"
      WHERE "eventId" IN (
        SELECT id FROM "EventReportPilots"
        WHERE data->>'eventId' IN (
          -- Scenario 1: Regional TTA Hosted Event (no NC)
          'R03-TTA-24-2001', 'R03-TTA-24-2002', 'R03-TTA-24-2003', 'R03-TTA-24-2004',
          -- Scenario 2: Regional PD Event (consolidated)
          'R03-PD-24-3001', 'R03-PD-24-3002', 'R03-PD-24-3003', 'R03-PD-24-3004'
        )
      );
    `);

    // Delete the new event reports
    await queryInterface.sequelize.query(`
      DELETE FROM "EventReportPilots"
      WHERE data->>'eventId' IN (
        -- Scenario 1: Regional TTA Hosted Event (no NC)
        'R03-TTA-24-2001', 'R03-TTA-24-2002', 'R03-TTA-24-2003', 'R03-TTA-24-2004',
        -- Scenario 2: Regional PD Event (consolidated)
        'R03-PD-24-3001', 'R03-PD-24-3002', 'R03-PD-24-3003', 'R03-PD-24-3004'
      );
    `);

    // Delete UserRoles
    await queryInterface.bulkDelete('UserRoles', { userId: 1, roleId: 17 }, {});

    // Delete permissions
    await queryInterface.bulkDelete('Permissions', { userId: 1, regionId: 3, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 3, regionId: 3, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 4, regionId: 3, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 5, regionId: 3, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 6, regionId: 3, scopeId: POC_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 9, regionId: 3, scopeId: READ_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 5, regionId: 3, scopeId: READ_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 3, regionId: 3, scopeId: READ_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 4, regionId: 3, scopeId: READ_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 6, regionId: 3, scopeId: READ_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 7, regionId: 3, scopeId: READ_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 8, regionId: 3, scopeId: READ_REPORTS }, {});
  },
};
