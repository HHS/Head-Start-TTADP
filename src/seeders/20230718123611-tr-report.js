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
        userId: 5,
        regionId: 1,
        scopeId: READ_WRITE_TRAINING_REPORTS,
      },
      {
        userId: 9,
        regionId: 1,
        scopeId: POC_TRAINING_REPORTS,
      },
    ];

    await queryInterface.bulkInsert('Permissions', readWriteTrainingReports, {});
    await queryInterface.bulkInsert('UserRoles', [{
      userId: 1,
      roleId: 17, // National Center
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    await queryInterface.sequelize.query(`
    -- create a report for cuke
    INSERT INTO "EventReportPilots" (
      "version",
      "ownerId",
      "collaboratorIds",
      "regionId",
      "data",
      "imported",
      "createdAt",
      "updatedAt",
      "pocIds"
    ) VALUES (
      1,
      5,
      ARRAY[]::INTEGER[],
      1,
      CAST('{"eventId":"R01-PD-23-1037","Full Event Title":"R01 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","eventName":"Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","eventOrganizer":"Regional PD Event (with National Centers)","audience":"Recipients","Event Duration/# NC Days of Support":"Series","targetPopulations":["None"],"vision":"Oral Health","creator":"cucumber@hogwarts.com"}' AS JSONB),
      CAST('{"Event ID":"R01-PD-23-1037","Full Event Title":"R01 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","Edit Title":"Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Ongoing Quality Improvement","Target Population(s)":"None","Overall Vision/Goal for the PD Event":"Oral Health","Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
        ARRAY
        [3]::INTEGER[] -- Harry Potter POC.
    );
  `);
  },

  async down(queryInterface) {
    // Delete the new event reports
    await queryInterface.sequelize.query(`
      DELETE FROM "EventReportPilots"
      WHERE data->>'eventId' IN (
        'R01-PD-23-1037',
     );
    `);

    await queryInterface.bulkDelete('Permissions', { userId: 5, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
  },
};
