const {
  prepMigration,
} = require('../lib/migration');

const {
  ENTITY_TYPE,
  GOAL_STATUS,
  OBJECTIVE_STATUS,
  APPROVAL_STATUSES,
} = require('../constants');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
        ----- Populate dimensional tables -----
        -- Add new statuses for reports
        -- Add Reasons
        -- Add TargetPopulations
        ----- REPORTS -----
        -- Insert Report records
        -- Create a mapping table
        -- Insert ReportTrainingEvent records
        -- Insert ReportTrainingSession records
        ----- REPORT TABLE EXTENSIONS -----
        -- Populate ReportParticipation
        -- Populate ReportNextSteps
        -- Populate ReportPageStates
        ----- REPORT LINK TABLES ------
        -- Skip ReportApprovals: no approvals for TRs
        -- Insert ReportCollaborators
        -- Insert ReportCollaboratorRoles
        -- Insert ReportCollaboratorTypes
        -- Insert ReportFiles from SessionReportPilotFiles
        -- Insert ReportNationalCenters
        -- Insert ReportReasons
        -- Insert ReportPageStates
        ----- GOAL TEMPLATES ------
        -- How
        ----- OBJECTIVES ------


        ----- Populate dimensional tables -----
        -- Add new Statuses
        INSERT INTO "Statuses" (
          name,
          "isTerminal",
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          'Not started',
          FALSE,
          1,
          NOW(),
          NOW()
        UNION
        SELECT 'In progress', FALSE, id, NOW(), NOW()
        FROM "ValidFor"
        WHERE LEFT(name, 6) = 'report'
        UNION
        SELECT 'Suspended', FALSE, 1, NOW(), NOW()
        UNION
        SELECT 'Complete', TRUE, id, NOW(), NOW()
        FROM "ValidFor"
        WHERE LEFT(name, 6) = 'report'
        ;
        -- Add new Reasons
        INSERT INTO "Reasons" (
          name,
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          'Below Competitive Threshold (CLASS)',
          1,
          NOW(),
          NOW()
        UNION
        SELECT  'Below Quality Threshold (CLASS)', 1, NOW(), NOW()
        UNION
        SELECT  'Change in Scope', 1, NOW(), NOW()
        UNION
        SELECT  'Child Incident', 1, NOW(), NOW()
        UNION
        SELECT  'Complaint', 1, NOW(), NOW()
        UNION
        SELECT  'COVID-19 response', 1, NOW(), NOW()
        UNION
        SELECT  'Full Enrollment', 1, NOW(), NOW()
        UNION
        SELECT  'New Recipient', 1, NOW(), NOW()
        UNION
        SELECT  'New Director or Management', 1, NOW(), NOW()
        UNION
        SELECT  'New Program Option', 1, NOW(), NOW()
        UNION
        SELECT  'New Staff / Turnover', 1, NOW(), NOW()
        UNION
        SELECT  'Ongoing Quality Improvement', 1, NOW(), NOW()
        UNION
        SELECT  'Planning/Coordination (also TTA Plan Agreement)', 1, NOW(), NOW()
        UNION
        SELECT  'School Readiness Goals', 1, NOW(), NOW()
        UNION
        SELECT  'Monitoring | Area of Concern', 1, NOW(), NOW()
        UNION
        SELECT  'Monitoring | Noncompliance', 1, NOW(), NOW()
        UNION
        SELECT  'Monitoring | Deficiency', 1, NOW(), NOW()
        ;

        -- Add new TargetPopulations
        INSERT INTO "TargetPopulations" (
          name,
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          'Infants and Toddlers (ages birth to 3)',
          1,
          NOW(),
          NOW()
        UNION
        SELECT  'Preschool (ages 3-5)', 1, NOW(), NOW()
        UNION
        SELECT  'Pregnant Women', 1, NOW(), NOW()
        UNION
        SELECT  'Affected by Child Welfare Involvement', 1, NOW(), NOW()
        UNION
        SELECT  'Affected by Disaster', 1, NOW(), NOW()
        UNION
        SELECT  'Affected by Substance Use', 1, NOW(), NOW()
        UNION
        SELECT  'Children Experiencing Homelessness', 1, NOW(), NOW()
        UNION
        SELECT  'Children with Disabilities', 1, NOW(), NOW()
        UNION
        SELECT  'Children with Special Health Care Needs', 1, NOW(), NOW()
        UNION
        SELECT  'Dual-Language Learners', 1, NOW(), NOW()
        UNION
        SELECT  'Program Staff', 1, NOW(), NOW()
        UNION
        SELECT  'Children/Families affected by systemic discrimination/bias/exclusion', 1, NOW(), NOW()
        UNION
        SELECT  'Children/Families affected by traumatic events', 1, NOW(), NOW()
        UNION
        SELECT  'Parents/Families impacted by health disparities', 1, NOW(), NOW()
        ;

        

        ------ Collect all reports that will generate report IDs
        DROP TABLE IF EXISTS interim_reports;
        CREATE TABLE interim_reports
        AS 
        SELECT
          erp.id pilot_record_id,
          1 "reportTypeId", -- the 'report.trainingEvent' ID in ValidFor
          s.id "statusId",
          erp.data->>'Sheet Name' context,
          NULL::date "startDate",
          NULL::date "endDate",
          erp."createdAt",
          erp."updatedAt",
          erp.data
        FROM "EventReportPilots" erp
        JOIN "Statuses" s
          ON COALESCE(erp.data->>'status','Not started') = s.name
          AND s."validForId" = 1
        UNION ALL
        SELECT
          srp.id pilot_record_id,
          2 "reportTypeId", -- the 'report.trainingSession' ID in ValidFor
          s.id "statusId",
          srp.data->>'context' context,
          to_date(srp.data->>'startDate','MM/DD/YYYY') "startDate",
          to_date(srp.data->>'endDate','MM/DD/YYYY') "endDate",
          srp."createdAt",
          srp."updatedAt",
          srp.data
        FROM "SessionReportPilots" srp
        JOIN "Statuses" s
          ON srp.data->>'status' = s.name
          AND s."validForId" = 2
        ;

        -- Create Report records in a janky way to get the new and old IDs mapped
        INSERT INTO "Reports" (
          "reportTypeId",
          "statusId",
          context,
          "startDate",
          "endDate",
          "createdAt",
          "updatedAt"
        )
        SELECT
          "reportTypeId",
          "statusId",
          COALESCE(context, 'null') || 'XYX' || pilot_record_id,
          "startDate",
          "endDate",
          "createdAt",
          "updatedAt"
        FROM interim_reports
        ;

        ALTER TABLE interim_reports ADD COLUMN reports_id INTEGER;

        -- add the Reports.id mapping to interim reports so we can use it elsewhere
        UPDATE interim_reports
        SET reports_id = id
        FROM "Reports" r
        WHERE (string_to_array(r.context, 'XYX'))[2]::integer = pilot_record_id
        ;

        -- Set Reports.context back to its normal values
        UPDATE "Reports"
        SET context = NULLIF((string_to_array(context, 'XYX'))[1], 'null'
        ;

      
        INSERT INTO "ReportTrainingEvents"
        (
          "reportId",
          "regionId",
          "eventId",
          name,
          "organizerId",
          audience,
          "trainingType",
          vision,
          "createdAt",
          "updatedAt"
        )
        SELECT
        FROM "EventReportPilots" erp

        INSERT INTO "ReportTrainingSessions"(
          "reportId",
          "reportTrainingEventId",
          "regionId",
          name,
          "createdAt",
          "updatedAt"
        )
        SELECT
          
        FROM "SessionReportPilots" srp
        JOIN interim_reports ir
          ON pilot_record_id = srp.id
          AND ir."reportTypeId" = 2
        JOIN "Reports" r
          ON srp.id = pilot_record_id

        --
        INSERT INTO "ReportTargetPopulations" (
          "reportId",
          "targetPopulationId",
          "createdAt",
          "updatedAt"
        )
        WITH unnested_target_populations AS (
        SELECT
          id,
          UNNEST(
            string_to_array(jsonb_array_elements_text(data->'targetPopulations'),E'\n')
          ) target_population
        FROM "EventReportPilots" erp
        )
        SELECT
          reports_id,
          utp.id,
          "createdAt",
          "updatedAt"
        FROM unnested_target_populations utp
        JOIN interim_reports ir
          ON utp.id = ir.pilot_record_id
        ;




        ;`, { transaction });
      /* TODO: How to migrate from "EventReportPilots"
      data.owner -> ReportCollaborator( type = owner)

      {
          data.creator,
          data."IST Name",
      } -> ReportCollaborator( type = instatiator )

      colaboratorIds -> ReportCollaborator(type = editor)

      data.goal -> ReportGoalTemplate
      {
          data.status
          data.stateDate
          data.endDate
          createdAt,
          updatedAt,
      } -> report(
          type = 'event',
          statusId = (look up id),
          startDate,
          endDate,
          createdAt,
          updatedAt,
          )

      {
          data.eventId, (not a number)
          data.region,
          data.eventName,
          data.eventOrganizer,
          data.audience,
          data.trainingType
          vision,
          createdAt,
          updatedAt,
      } -> ReportTrainingEvent(
          eventId, (not a number, needs to be added to the table and model)
          regionId,
          name,
          organizerId = (look up id),
          audience, // currently an enum, should this be changed to an id lookup
          trainingType,
          vision,
          createdAt,
          updatedAt,
      )

      data.reasons -> ReportReasons

      data."National Center(s) Requested" -> ReportNationalCenter(
          nationalCenterId = (look up each of the ids, 1 per record),
      )

      data.targetPopulations -> ReporttargetPopulation(
          targetPopulationId = (look up each of the ids, 1 per record),
      )

      imported -> ReportImported() // this does not exist yet, but should be very simple

      pageState -> ReportPageState

      I dont have a method/plan/structure for saving the page state. This needs to be added. Perferibly to a new table.
      */

      /* TODO: How to migrate from "SessionReportPilots"
        I have a few I dont know where I want to put them:
          duration

        {
          data.ownerId,
          data.eventOwner,
        } -> ReportCollaborator( type = owner)

        {
          data.status,
          data.context,
          data.stateDate,
          data.endDate,
          createdAt,
          updatedAt,
        } -> Report(
          type = 'session',
          statusId = (look up id),
          context
          startDate,
          endDate,
          createdAt,
          updatedAt,
        )

        {
          data.regionId,
          data.sessionName,
        } -> ReportTrainingSession(
          reportTrainingEventId // ID of linked event,
          regionId,
          name,
        )

        {
          data.objective,
          data.ttaProvided,
          data.objectiveSupportType
        } -> ReportObjectiveTemplate(
          objectiveTitle
          ttaProvided,
          supportType
        ) -> ObjectiveTemplate(
          objectiveTitle
        )

        data.files -> ReportObjectiveTemplateFiles -> ObjectiveTemplateFiles

        data.objectiveResources -> ReportObjectiveTemplateResources -> ObjectiveTemplateResources

        data.objectiveTopics -> ReportObjectiveTemplateTopics -> ObjectiveTemplateTopics

        data.objectiveTrainers -> ReportObjectiveTemplateTrainers

        data.recipients -> ReportRecipients

        data.recipientNextSteps -> reportNextSteps( type = recipient)

        data.specialistNextSteps -> reportNextSteps( type = specialist)

        {
          data.deliveryMethod,
          data.numberOfParticipants,
          data.numberOfParticipantsInPerson,
          data.numberOfParticipantsVirtually,
          data.participants,
        } -> reportParticipations(
          deliveryMethod, // should/will be calculated from the distinct values if they are available, where either is null indicate the other type, both non-null it hybrid
          numberOfParticipants, // should/will be calculated from the distinct values if they are available
          inpersonParticipants,
          virtualParticipants
        ) -> reportParticipationParticipants (
          participentid
        ) -> Participants()
      */
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`


      -- Set statuses how they were previously --
      DROP TABLE IF EXISTS status_ids_for_removal;
      CREATE TEMP TABLE status_ids_for_removal
      AS
      SELECT id FROM "Statuses"
      WHERE name IN ('Not started', 'In progress')
      ;

      DELETE FROM "Statuses" 
      WHERE id IN (SELECT id FROM status_ids_for_removal)
      ;

      UPDATE "Statuses"
      SET "mapsTo" = NULL
      WHERE "mapsTo" IN (SELECT id FROM status_ids_for_removal)
      ;
      `, { transaction });
    },
  ),
};
