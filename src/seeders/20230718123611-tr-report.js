const { SCOPE_IDS } = require('@ttahub/common');

const {
  READ_WRITE_TRAINING_REPORTS,
  POC_TRAINING_REPORTS,
} = SCOPE_IDS;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const readWriteTrainingReports = [
      {
        userId: 1,
        regionId: 1,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 1,
        regionId: 3,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 5,
        regionId: 1,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 3,
        regionId: 3,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 4,
        regionId: 3,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
    ];

    const collaboratorTrainingReports = [
      {
        userId: 3,
        regionId: 3,
        scopeId: POC_TRAINING_REPORTS,
      },
    ];

    await queryInterface.bulkInsert('Permissions', readWriteTrainingReports, {});
    await queryInterface.bulkInsert('Permissions', collaboratorTrainingReports, {});

    await queryInterface.sequelize.query(`
    -- create a report for cuke
    INSERT INTO "EventReportPilots" (
      "ownerId",
      "collaboratorIds",
      "regionId",
      "data",
      "imported",
      "createdAt",
      "updatedAt",
      "pocIds"
    ) VALUES (
      5,
      ARRAY[]::INTEGER[],
      1,
      CAST('{"eventId":"R01-PD-23-1037","Full Event Title":"R01 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","eventName":"Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","eventOrganizer":"Regional PD Event (with National Centers)","audience":"Recipients","Event Duration/# NC Days of Support":"Series","reasons":["Ongoing Quality Improvement"],"targetPopulations":["None"],"vision":"Oral Health","creator":"cucumber@hogwarts.com"}' AS JSONB),
      CAST('{"Event ID":"R01-PD-23-1037","Full Event Title":"R01 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","Edit Title":"Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Ongoing Quality Improvement","Target Population(s)":"None","Overall Vision/Goal for the PD Event":"Oral Health","Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
        ARRAY
        [3]::INTEGER[] -- Harry Potter POC.
    );

    -- Regional TTA Hosted Event (no National Centers)
    -- Owner=5, Collaborator=3, POC=4
    INSERT INTO "EventReportPilots" (
      "ownerId",
      "collaboratorIds",
      "regionId",
      "data",
      "imported",
      "createdAt",
      "updatedAt",
      "pocIds"
    ) VALUES (
      5,
      ARRAY[3]::INTEGER[],
      3,
      CAST('{"eventId":"R03-TTA-24-1001","eventName":"Regional TTA Event - Leadership Development","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["Monitoring | Area of Concern","Monitoring | Deficiency","Monitoring | Noncompliance"],"targetPopulations":["Infants and Toddlers (ages birth to 3)","Preschool Children (ages 3-5)"],"vision":"Leadership and Governance","creator":"cucumber@hogwarts.com","eventSubmitted":true,"status":"In progress"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-1001","Event Title":"Regional TTA Event - Leadership Development","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Monitoring | Area of Concern\\nMonitoring | Deficiency\\nMonitoring | Noncompliance","Target Population(s)":"Infants and Toddlers (ages birth to 3)\\nPreschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Leadership and Governance","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[4]::INTEGER[]
    );

    -- Regional PD Event (with National Centers)
    -- Owner=5, Collaborator=3, POC=4
    INSERT INTO "EventReportPilots" (
      "ownerId",
      "collaboratorIds",
      "regionId",
      "data",
      "imported",
      "createdAt",
      "updatedAt",
      "pocIds"
    ) VALUES (
      5,
      ARRAY[3]::INTEGER[],
      3,
      CAST('{"eventId":"R03-PD-24-1002","eventName":"Regional PD Event - School Readiness","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["Child Incident","New Director or Management","New Program Option"],"targetPopulations":["Expectant families","Infants and Toddlers (ages birth to 3)"],"vision":"School Readiness","creator":"cucumber@hogwarts.com","eventSubmitted":true,"status":"In progress"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-1002","Event Title":"Regional PD Event - School Readiness","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Child Incident\\nNew Director or Management\\nNew Program Option","Target Population(s)":"Expectant families\\nInfants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"School Readiness","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[4]::INTEGER[]
    );

    -- Session for Regional PD Event (R03-PD-24-1002) with national_center facilitation
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      1,
      CAST('{"sessionName":"School Readiness Workshop - National Center","startDate":"2024-02-03","endDate":"2024-02-03","duration":4,"deliveryMethod":"in-person","context":"Specialized school readiness assessment","objective":"Master assessment techniques","numberOfParticipants":25,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Assessment","Child Development"],"objectiveTrainers":["NCQTL"],"participants":["Teacher","Coach"],"additionalStates":[],"reviewStatus":"draft"}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1002';

    -- Session for Regional PD Event (R03-PD-24-1002) with regional_tta_staff facilitation
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      1,
      CAST('{"sessionName":"School Readiness Workshop - Regional TTA","startDate":"2024-01-20","endDate":"2024-01-20","duration":4,"deliveryMethod":"virtual","context":"Building school readiness skills","objective":"Improve school readiness outcomes","numberOfParticipants":35,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Teaching Practices"],"objectiveTrainers":["Regional TTA Team"],"participants":["Teacher","Coach","Manager / Coordinator / Specialist"],"additionalStates":[],"reviewStatus":"draft"}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1002';

    -- Session for Regional PD Event (R03-PD-24-1002) with both facilitation
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      1,
      CAST('{"sessionName":"School Readiness Workshop - Both","startDate":"2024-01-27","endDate":"2024-01-27","duration":3.5,"deliveryMethod":"virtual","context":"Advanced school readiness strategies","objective":"Deepen school readiness implementation","numberOfParticipants":30,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Curriculum Development"],"objectiveTrainers":["Regional TTA Team","NCQTL"],"participants":["Teacher","Coach","Education Manager"],"additionalStates":[],"reviewStatus":"draft"}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1002';
  `);
  },

  async down(queryInterface) {
    // Delete session reports first (due to foreign key constraints)
    await queryInterface.sequelize.query(`
      DELETE FROM "SessionReportPilots"
      WHERE "eventId" IN (
        SELECT id FROM "EventReportPilots"
        WHERE data->>'eventId' IN (
          'R01-PD-23-1037',
          'R03-TTA-24-1001',
          'R03-PD-24-1002'
        )
      );
    `);

    // Delete the new event reports
    await queryInterface.sequelize.query(`
      DELETE FROM "EventReportPilots"
      WHERE data->>'eventId' IN (
        'R01-PD-23-1037',
        'R03-TTA-24-1001',
        'R03-PD-24-1002'
      );
    `);

    // Delete original event reports and permissions
    await queryInterface.bulkDelete('EventReportPilots', { ownerId: 1 }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 1, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 3, scopeId: POC_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 5, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
  },
};
