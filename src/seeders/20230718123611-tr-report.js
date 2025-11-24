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
        regionId: 3,
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

    -- Scenario 1: Regional TTA (no NC), Owner=5, Approver=1, POC=[3], submitted=true
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
      ARRAY[4]::INTEGER[],
      3,
      CAST('{"eventId":"R03-TTA-24-1001","eventName":"Regional TTA Event - Leadership Development","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["Monitoring | Area of Concern","Monitoring | Deficiency","Monitoring | Noncompliance"],"targetPopulations":["Infants and Toddlers (ages birth to 3)","Preschool Children (ages 3-5)"],"vision":"Leadership and Governance","creator":"cucumber@hogwarts.com","eventSubmitted":true,"status":"In progress","mockLabel":"Regional TTA Hosted Event (no National Centers) User 5 is owner"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-1001","Event Title":"Regional TTA Event - Leadership Development","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Monitoring | Area of Concern\\nMonitoring | Deficiency\\nMonitoring | Noncompliance","Target Population(s)":"Infants and Toddlers (ages birth to 3)\\nPreschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Leadership and Governance","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[3]::INTEGER[]
    );

    -- Scenario 2: Regional PD (with NC), Owner=5, Approver=1, POC=[3], submitted=true
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
      3,
      CAST('{"eventId":"R03-PD-24-1002","eventName":"Regional PD Event - School Readiness","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["Child Incident","New Director or Management","New Program Option"],"targetPopulations":["Expectant families","Infants and Toddlers (ages birth to 3)"],"vision":"School Readiness","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"In progress","mockLabel":"Regional PD Event (with National Centers) User 5 is owner"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-1002","Event Title":"Regional PD Event - School Readiness","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Child Incident\\nNew Director or Management\\nNew Program Option","Target Population(s)":"Expectant families\\nInfants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"School Readiness","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[3]::INTEGER[]
    );

    -- Scenario 3: Regional TTA (no NC), Owner=3, Approver=5, POC=[1], submitted=true
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
      3,
      ARRAY[]::INTEGER[],
      3,
      CAST('{"eventId":"R03-TTA-24-1003","eventName":"Regional TTA Event - Family Engagement","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"regional-office-tta","trainingType":"Series","reasons":["New Staff / Turnover","Ongoing Quality Improvement"],"targetPopulations":["Preschool Children (ages 3-5)"],"vision":"Family Well-being","creator":"hermoine@hogwarts.com","eventSubmitted":true,"status":"In progress"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-1003","Event Title":"Regional TTA Event - Family Engagement","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Regional office/TTA","Event Duration/# NC Days of Support":"Series","Reason for Activity":"New Staff / Turnover\\nOngoing Quality Improvement","Target Population(s)":"Preschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Family Well-being","IST/Creator":"hermoine@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[1]::INTEGER[]
    );

    -- Scenario 4: Regional PD (with NC), Owner=3, Approver=5, POC=[1], submitted=true
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
      3,
      ARRAY[]::INTEGER[],
      3,
      CAST('{"eventId":"R03-PD-24-1004","eventName":"Regional PD Event - CLASS Implementation","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["COVID-19 response","Planning/Coordination"],"targetPopulations":["Infants and Toddlers (ages birth to 3)","Preschool Children (ages 3-5)"],"vision":"Teaching Practices and Interactions","creator":"hermoine@hogwarts.com","eventSubmitted":true,"status":"In progress"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-1004","Event Title":"Regional PD Event - CLASS Implementation","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"COVID-19 response\\nPlanning/Coordination","Target Population(s)":"Infants and Toddlers (ages birth to 3)\\nPreschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Teaching Practices and Interactions","IST/Creator":"hermoine@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[1]::INTEGER[]
    );

    -- Scenario 5: Regional TTA (no NC), Owner=1, Approver=3, POC=[5], submitted=true
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
      1,
      ARRAY[]::INTEGER[],
      3,
      CAST('{"eventId":"R03-TTA-24-1005","eventName":"Regional TTA Event - Fiscal Management","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["New Grantee","New Program Option"],"targetPopulations":["Infants and Toddlers (ages birth to 3)"],"vision":"Fiscal Management","creator":"harry@hogwarts.com","eventSubmitted":true,"status":"In progress","mockLabel":"Regional TTA Hosted Event (no National Centers) User 5 is POC"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-1005","Event Title":"Regional TTA Event - Fiscal Management","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"New Grantee\\nNew Program Option","Target Population(s)":"Infants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"Fiscal Management","IST/Creator":"harry@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[5]::INTEGER[]
    );

    -- Scenario 6: Regional PD (with NC), Owner=1, Approver=3, POC=[5], submitted=true
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
      1,
      ARRAY[4]::INTEGER[],
      3,
      CAST('{"eventId":"R03-PD-24-1006","eventName":"Regional PD Event - Health and Safety","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["Ongoing Quality Improvement","Planning/Coordination"],"targetPopulations":["Expectant families","Infants and Toddlers (ages birth to 3)","Preschool Children (ages 3-5)"],"vision":"Facilities and Safe Environments","creator":"harry@hogwarts.com","eventSubmitted":true,"status":"In progress","mockLabel":"Regional PD Event (with National Centers) User 5 is POC"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-1006","Event Title":"Regional PD Event - Health and Safety","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Ongoing Quality Improvement\\nPlanning/Coordination","Target Population(s)":"Expectant families\\nInfants and Toddlers (ages birth to 3)\\nPreschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Facilities and Safe Environments","IST/Creator":"harry@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[5]::INTEGER[]
    );

    -- Scenario 7: Regional TTA (no NC), Owner=5, Approver=null, POC=[3], submitted=false
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
      3,
      CAST('{"eventId":"R03-TTA-24-1007","eventName":"Regional TTA Event - Community Partnerships","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["New Staff / Turnover"],"targetPopulations":["Preschool Children (ages 3-5)"],"vision":"Community and Self-Assessment","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"In progress","mockLabel":"Regional TTA Hosted Event (no National Centers) User 5 is owner"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-1007","Event Title":"Regional TTA Event - Community Partnerships","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"New Staff / Turnover","Target Population(s)":"Preschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Community and Self-Assessment","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[3]::INTEGER[]
    );

    -- Scenario 8: Regional PD (with NC), Owner=5, Approver=null, POC=[3], submitted=false
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
      3,
      CAST('{"eventId":"R03-PD-24-1008","eventName":"Regional PD Event - Nutrition Services","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["Monitoring | Area of Concern"],"targetPopulations":["Infants and Toddlers (ages birth to 3)"],"vision":"Nutrition","creator":"cucumber@hogwarts.com","eventSubmitted":false,"status":"In progress","mockLabel":"Regional PD Event (with National Centers) User 5 is owner"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-1008","Event Title":"Regional PD Event - Nutrition Services","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Monitoring | Area of Concern","Target Population(s)":"Infants and Toddlers (ages birth to 3)","Overall Vision/Goal for the PD Event":"Nutrition","IST/Creator":"cucumber@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[3]::INTEGER[]
    );

    -- Scenario 9: Regional PD (with NC), Owner=1, Approver=null, POC=[], Collaborator=[5], submitted=false
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
      1,
      ARRAY[5]::INTEGER[],
      3,
      CAST('{"eventId":"R03-PD-24-1009","eventName":"Regional PD Event - ERSEA Implementation","eventOrganizer":"Regional PD Event (with National Centers)","eventIntendedAudience":"recipients","trainingType":"Series","reasons":["New Program Option","Planning/Coordination"],"targetPopulations":["Expectant families"],"vision":"ERSEA","creator":"harry@hogwarts.com","eventSubmitted":false,"status":"In progress","mockLabel":"Regional PD Event (with National Centers) User 5 is collaborator"}' AS JSONB),
      CAST('{"Event ID":"R03-PD-24-1009","Event Title":"Regional PD Event - ERSEA Implementation","Event Organizer - Type of Event":"Regional PD Event (with National Centers)","Audience":"Recipients","Event Duration/# NC Days of Support":"Series","Reason for Activity":"New Program Option\\nPlanning/Coordination","Target Population(s)":"Expectant families","Overall Vision/Goal for the PD Event":"ERSEA","IST/Creator":"harry@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[]::INTEGER[]
    );

    -- Scenario 10: Regional TTA (no NC), Owner=1, Approver=null, POC=[], Collaborator=[5], submitted=false
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
      1,
      ARRAY[5]::INTEGER[],
      3,
      CAST('{"eventId":"R03-TTA-24-1010","eventName":"Regional TTA Event - Special Needs Support","eventOrganizer":"Regional TTA Hosted Event (no National Centers)","eventIntendedAudience":"regional-office-tta","trainingType":"Series","reasons":["Ongoing Quality Improvement"],"targetPopulations":["Infants and Toddlers (ages birth to 3)","Preschool Children (ages 3-5)"],"vision":"Disabilities Services and Grantee Specialization","creator":"harry@hogwarts.com","eventSubmitted":false,"status":"In progress","mockLabel":"Regional TTA Hosted Event (no National Centers) User 5 is collaborator"}' AS JSONB),
      CAST('{"Event ID":"R03-TTA-24-1010","Event Title":"Regional TTA Event - Special Needs Support","Event Organizer - Type of Event":"Regional TTA Hosted Event (no National Centers)","Audience":"Regional office/TTA","Event Duration/# NC Days of Support":"Series","Reason for Activity":"Ongoing Quality Improvement","Target Population(s)":"Infants and Toddlers (ages birth to 3)\\nPreschool Children (ages 3-5)","Overall Vision/Goal for the PD Event":"Disabilities Services and Grantee Specialization","IST/Creator":"harry@hogwarts.com"}' AS JSONB),
      NOW(),
      NOW(),
      ARRAY[]::INTEGER[]
    );

    -- SessionReportPilots for scenarios with submitted=true (scenarios 1-6)
    -- Scenario 1 Session (Owner=5, Approver=1, POC=[3])
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
      CAST('{"sessionName":"Leadership Development Session 1","startDate":"2024-01-15","endDate":"2024-01-15","duration":3,"deliveryMethod":"in-person","context":"Developing leadership skills for program directors","objective":"Enhance leadership competencies","numberOfParticipants":25,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"recipients":[{"value":1234,"label":"Example Recipient 1"}],"objectiveTopics":["Leadership","Management"],"objectiveTrainers":["PFCE"],"participants":["Program Director (HS / EHS)","Manager / Coordinator / Specialist"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-TTA-24-1001';

    -- Scenario 2 Session (Owner=5, Approver=1, POC=[3])
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
      CAST('{"sessionName":"School Readiness Workshop","startDate":"2024-01-20","endDate":"2024-01-20","duration":4,"deliveryMethod":"virtual","context":"Building school readiness skills","objective":"Improve school readiness outcomes","numberOfParticipants":35,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Teaching Practices"],"objectiveTrainers":["Regional TTA Team"],"participants":["Teacher","Coach","Manager / Coordinator / Specialist"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1002';

    -- Scenario 3 Session (Owner=3, Approver=5, POC=[1])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      5,
      CAST('{"sessionName":"Family Engagement Strategies","startDate":"2024-02-05","endDate":"2024-02-05","duration":2.5,"deliveryMethod":"hybrid","context":"Strengthening family engagement practices","objective":"Increase family participation","numberOfParticipants":20,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"recipients":[{"value":1236,"label":"Example Recipient 3"}],"objectiveTopics":["Family Engagement","Parent Involvement"],"objectiveTrainers":["PFCE"],"participants":["Family Service Worker / Case Manager","Home Visitor"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-TTA-24-1003';

    -- Scenario 4 Session (Owner=3, Approver=5, POC=[1])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      5,
      CAST('{"sessionName":"CLASS Implementation Training","startDate":"2024-02-10","endDate":"2024-02-10","duration":6,"deliveryMethod":"in-person","context":"Implementing CLASS framework","objective":"Improve classroom interactions","numberOfParticipants":40,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1237,"label":"Example Recipient 4"}],"objectiveTopics":["CLASS","Teaching Practices"],"objectiveTrainers":["NCQTL"],"participants":["Teacher","Coach","Education Manager"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1004';

    -- Scenario 5 Session (Owner=1, Approver=3, POC=[5])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      3,
      CAST('{"sessionName":"Fiscal Management Best Practices","startDate":"2024-02-15","endDate":"2024-02-15","duration":3,"deliveryMethod":"virtual","context":"Improving fiscal management systems","objective":"Enhance budget oversight","numberOfParticipants":15,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"recipients":[{"value":1238,"label":"Example Recipient 5"}],"objectiveTopics":["Fiscal / Budget","Facilities"],"objectiveTrainers":["PFMO"],"participants":["Fiscal Manager/Team","CEO / CFO / Executive"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-TTA-24-1005';

    -- Scenario 6 Session (Owner=1, Approver=3, POC=[5])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      3,
      CAST('{"sessionName":"Health and Safety Training","startDate":"2024-02-20","endDate":"2024-02-20","duration":4,"deliveryMethod":"in-person","context":"Ensuring health and safety compliance","objective":"Meet health and safety standards","numberOfParticipants":30,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1239,"label":"Example Recipient 6"}],"objectiveTopics":["Facilities","Safety Practices"],"objectiveTrainers":["NCHBHS"],"participants":["Health Manager","Family Service Worker / Case Manager","Program Director (HS / EHS)"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1006';

    -- SessionReportPilots for scenarios with submitted=false (scenarios 7-10)
    -- These have approverId=null and ownerComplete/pocComplete=false
    -- Scenario 7 Session (Owner=5, Approver=null, POC=[3])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"Community Partnerships Session","startDate":"2024-03-01","endDate":"2024-03-01","duration":2,"deliveryMethod":"virtual","context":"Building community partnerships","objective":"Strengthen community connections","numberOfParticipants":18,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"recipients":[{"value":1240,"label":"Example Recipient 7"}],"objectiveTopics":["Community Engagement","Partnerships"],"objectiveTrainers":["Regional TTA Team"],"participants":["Manager / Coordinator / Specialist"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-TTA-24-1007';

    -- Scenario 8 Session (Owner=5, Approver=null, POC=[3])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"Nutrition Services Training","startDate":"2024-03-05","endDate":"2024-03-05","duration":3,"deliveryMethod":"in-person","context":"Implementing nutrition guidelines","objective":"Improve nutrition services","numberOfParticipants":22,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1241,"label":"Example Recipient 8"}],"objectiveTopics":["Nutrition","Health Services"],"objectiveTrainers":["NCHBHS"],"participants":["Health Manager","Nutrition Specialist"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1008';

    -- Scenario 9 Session (Owner=1, Approver=null, Collaborator=[5])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"ERSEA Implementation Session","startDate":"2024-03-10","endDate":"2024-03-10","duration":3.5,"deliveryMethod":"hybrid","context":"Implementing ERSEA processes","objective":"Improve ERSEA compliance","numberOfParticipants":28,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"regional_tta_staff","recipients":[{"value":1242,"label":"Example Recipient 9"}],"objectiveTopics":["ERSEA","Eligibility"],"objectiveTrainers":["Regional TTA Team"],"participants":["Manager / Coordinator / Specialist","Program Support / Administrative Assistant"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1009';

    -- Scenario 10 Session (Owner=1, Approver=null, Collaborator=[5])
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"Special Needs Support Training","startDate":"2024-03-15","endDate":"2024-03-15","duration":4,"deliveryMethod":"virtual","context":"Supporting children with special needs","objective":"Enhance supportive practices","numberOfParticipants":32,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"recipients":[{"value":1243,"label":"Example Recipient 10"}],"objectiveTopics":["Disabilities Services","Individualized Support","Special Needs"],"objectiveTrainers":["NCECDTL"],"participants":["Teacher","Special Needs Coordinator","Coach"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-TTA-24-1010';

    -- Additional sessions for Regional PD events with different facilitation types
    -- Scenario 2: Add "both" and "national_center" sessions
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
      CAST('{"sessionName":"School Readiness Workshop - Session 2","startDate":"2024-01-27","endDate":"2024-01-27","duration":3.5,"deliveryMethod":"virtual","context":"Advanced school readiness strategies","objective":"Deepen school readiness implementation","numberOfParticipants":30,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Curriculum Development"],"objectiveTrainers":["Regional TTA Team","NCQTL"],"participants":["Teacher","Coach","Education Manager"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1002';

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
      CAST('{"sessionName":"School Readiness Workshop - Session 3","startDate":"2024-02-03","endDate":"2024-02-03","duration":4,"deliveryMethod":"in-person","context":"Specialized school readiness assessment","objective":"Master assessment techniques","numberOfParticipants":25,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1235,"label":"Example Recipient 2"}],"objectiveTopics":["School Readiness","Assessment","Child Development"],"objectiveTrainers":["NCQTL"],"participants":["Teacher","Coach"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1002';

    -- Scenario 4: Add "both" and "national_center" sessions
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      5,
      CAST('{"sessionName":"CLASS Implementation Training - Session 2","startDate":"2024-02-17","endDate":"2024-02-17","duration":5,"deliveryMethod":"hybrid","context":"Advanced CLASS coaching techniques","objective":"Refine CLASS implementation","numberOfParticipants":35,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1237,"label":"Example Recipient 4"}],"objectiveTopics":["CLASS","Coaching","Observation"],"objectiveTrainers":["Regional TTA Team","NCQTL"],"participants":["Coach","Education Manager","Teacher"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1004';

    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      5,
      CAST('{"sessionName":"CLASS Implementation Training - Session 3","startDate":"2024-02-24","endDate":"2024-02-24","duration":6,"deliveryMethod":"virtual","context":"CLASS certification preparation","objective":"Prepare for CLASS reliability","numberOfParticipants":20,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1237,"label":"Example Recipient 4"}],"objectiveTopics":["CLASS","Certification","Quality Assurance"],"objectiveTrainers":["NCQTL"],"participants":["Coach","Education Manager"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1004';

    -- Scenario 6: Add "both" and "national_center" sessions
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      3,
      CAST('{"sessionName":"Health and Safety Training - Session 2","startDate":"2024-02-27","endDate":"2024-02-27","duration":3,"deliveryMethod":"virtual","context":"Advanced health protocols","objective":"Enhance health monitoring systems","numberOfParticipants":28,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1239,"label":"Example Recipient 6"}],"objectiveTopics":["Health Services","Monitoring","Compliance"],"objectiveTrainers":["Regional TTA Team","NCHBHS"],"participants":["Health Manager","Program Director (HS / EHS)"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1006';

    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      3,
      CAST('{"sessionName":"Health and Safety Training - Session 3","startDate":"2024-03-05","endDate":"2024-03-05","duration":4,"deliveryMethod":"in-person","context":"Specialized health screenings","objective":"Implement comprehensive screening protocols","numberOfParticipants":25,"status":"In progress","ownerComplete":true,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1239,"label":"Example Recipient 6"}],"objectiveTopics":["Health Screenings","Wellness","Preventive Care"],"objectiveTrainers":["NCHBHS"],"participants":["Health Manager","Nurse"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1006';

    -- Scenario 8: Add "both" and "national_center" sessions
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"Nutrition Services Training - Session 2","startDate":"2024-03-12","endDate":"2024-03-12","duration":2.5,"deliveryMethod":"virtual","context":"Advanced nutrition planning","objective":"Develop comprehensive nutrition plans","numberOfParticipants":20,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1241,"label":"Example Recipient 8"}],"objectiveTopics":["Nutrition","Menu Planning","Food Safety"],"objectiveTrainers":["Regional TTA Team","NCHBHS"],"participants":["Nutrition Specialist","Health Manager"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1008';

    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"Nutrition Services Training - Session 3","startDate":"2024-03-19","endDate":"2024-03-19","duration":3,"deliveryMethod":"hybrid","context":"Specialized dietary accommodations","objective":"Implement individualized nutrition support","numberOfParticipants":18,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1241,"label":"Example Recipient 8"}],"objectiveTopics":["Special Diets","Allergies","Nutrition Science"],"objectiveTrainers":["NCHBHS"],"participants":["Nutrition Specialist","Cook"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1008';

    -- Scenario 9: Add "both" and "national_center" sessions
    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"ERSEA Implementation Session - Session 2","startDate":"2024-03-17","endDate":"2024-03-17","duration":3,"deliveryMethod":"virtual","context":"Advanced ERSEA strategies","objective":"Optimize eligibility processes","numberOfParticipants":25,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"both","recipients":[{"value":1242,"label":"Example Recipient 9"}],"objectiveTopics":["ERSEA","Data Management","Community Outreach"],"objectiveTrainers":["Regional TTA Team","National Center"],"participants":["Manager / Coordinator / Specialist","Enrollment Coordinator"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1009';

    INSERT INTO "SessionReportPilots" (
      "eventId",
      "approverId",
      "data",
      "createdAt",
      "updatedAt"
    )
    SELECT
      id,
      NULL,
      CAST('{"sessionName":"ERSEA Implementation Session - Session 3","startDate":"2024-03-24","endDate":"2024-03-24","duration":4,"deliveryMethod":"in-person","context":"ERSEA compliance and reporting","objective":"Master ERSEA documentation","numberOfParticipants":22,"status":"In progress","ownerComplete":false,"pocComplete":false,"regionId":3,"facilitation":"national_center","recipients":[{"value":1242,"label":"Example Recipient 9"}],"objectiveTopics":["ERSEA","Compliance","Reporting"],"objectiveTrainers":["National Center"],"participants":["Program Support / Administrative Assistant","Manager / Coordinator / Specialist"]}' AS JSONB),
      NOW(),
      NOW()
    FROM "EventReportPilots"
    WHERE data->>'eventId' = 'R03-PD-24-1009';
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
          'R03-PD-24-1002',
          'R03-TTA-24-1003',
          'R03-PD-24-1004',
          'R03-TTA-24-1005',
          'R03-PD-24-1006',
          'R03-TTA-24-1007',
          'R03-PD-24-1008',
          'R03-PD-24-1009',
          'R03-TTA-24-1010'
        )
      );
    `);

    // Delete the new event reports
    await queryInterface.sequelize.query(`
      DELETE FROM "EventReportPilots"
      WHERE data->>'eventId' IN (
        'R01-PD-23-1037',
        'R03-TTA-24-1001',
        'R03-PD-24-1002',
        'R03-TTA-24-1003',
        'R03-PD-24-1004',
        'R03-TTA-24-1005',
        'R03-PD-24-1006',
        'R03-TTA-24-1007',
        'R03-PD-24-1008',
        'R03-PD-24-1009',
        'R03-TTA-24-1010'
      );
    `);

    // Delete original event reports and permissions
    await queryInterface.bulkDelete('EventReportPilots', { ownerId: 1 }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 1, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 3, scopeId: POC_TRAINING_REPORTS }, {});
    await queryInterface.bulkDelete('Permissions', { userId: 5, scopeId: READ_WRITE_TRAINING_REPORTS }, {});
  },
};
