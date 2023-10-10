const {
  REASONS,
  TARGET_POPULATIONS,
  EVENT_TARGET_POPULATIONS,
} = require('@ttahub/common');

const {
  prepMigration,
} = require('../lib/migration');

const {
  ENTITY_TYPE,
  GOAL_STATUS,
  OBJECTIVE_STATUS,
  APPROVAL_STATUSES,
  NEXTSTEP_NOTETYPE,
} = require('../constants');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
        ----- Populate dimensional tables -----
        -- Add Reasons
        -- Add TargetPopulations
        -- Add Organizers
        ----- REPORTS -----
        -- Insert Report records
        -- Create a mapping table
        -- Insert ReportTrainingEvent records
        -- Insert ReportTrainingSession records
        ----- REPORT TABLE EXTENSIONS -----
        -- Populate ReportParticipation
        -- Populate ReportNextSteps
        -- Populate ReportPageStates
        -- Populate ReportImports
        ----- REPORT LINK TABLES ------
        -- Skip ReportApprovals: no approvals for TRs
        -- Insert ReportCollaborators
        -- Insert ReportCollaboratorRoles
        -- Insert ReportCollaboratorTypes
        -- Insert ReportFiles from SessionReportPilotFiles
        -- Insert ReportNationalCenters
        -- Insert ReportReasons
        -- Insert ReportTargetPopulations
        -- Insert ReportRecipients
        ----- OBJECTIVES ------
        -- Find or insert Objectives for sessions
        -- Insert ObjectiveTopics
        -- Insert ObjectiveFiles
        -- Insert ObjectiveResources
        -- Find or insert ObjectiveTemplates text for region on complete session
        -- Insert ObjectiveTemplateTopics
        -- Insert ObjectiveTemplateResources
        ----- GOALS ------
        -- Find or insert GoalTemplates text for region
        -- Insert ReportGoalTemplates
        -- Find or insert Goals for session Grants
        -- Insert ReportGoals
        -- Update Objectives with goalId
        -- Insert GoalTemplateObjectiveTemplates


        ------------------------------------------------------------------------------------------------
        ----- Populate dimensional tables --------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        -- TODO: remove these status inserts once Objective statuses are populating in the generic migration
        INSERT INTO "Statuses" (
          name,
          "isTerminal",
          ordinal,
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          'Not Started',
          FALSE,
          1,
          4,
          NOW(),
          NOW()
        UNION
        SELECT 'In Progress', FALSE, 2,4, NOW(), NOW()
        UNION
        SELECT 'Suspended', FALSE, 3,4, NOW(), NOW()
        UNION
        SELECT 'Complete', TRUE, 4,4, NOW(), NOW()
        ;

        -- Add new Reasons
        INSERT INTO "Reasons"(
          name,
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          s.name,
          1,
          NOW(),
          NOW()
        FROM UNNEST(ARRAY[
          ${REASONS.map((reasons) => `'${reasons}'`).join(',\n')}
        ]) s(name)
        ;

        -- Add new TargetPopulations
        INSERT INTO "TargetPopulations"(
          name,
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          s.name,
          1,
          NOW(),
          NOW()
        FROM UNNEST(ARRAY[
          ${TARGET_POPULATIONS.map((tp) => `'${tp}'`).join(',\n')},
          ${EVENT_TARGET_POPULATIONS.map((etp) => `'${etp}'`).join(',\n')}
        ]) s(name)
        ;

        INSERT INTO "Organizers" (
          name,
          "validForId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          'Regional PD Event (with National Centers)',
          1,
          NOW(),
          NOW()
        UNION
        SELECT 'IST TTA/Visit', 1, NOW(), NOW()
        ;

        ------------------------------------------------------------------------------------------------
        ----- REPORTS ----------------------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        
        
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
          AND r."reportTypeId" = interim_reports."reportTypeId" 
        ;

        -- Set Reports.context back to its normal values
        UPDATE "Reports"
        SET context = NULLIF((string_to_array(context, 'XYX'))[1], 'null')
        ;

      
        INSERT INTO "ReportTrainingEvents"
        (
          "reportId",
          "regionId",
          "eventId",
          name,
          "organizerId",
          "trainingType",
          vision,
          "createdAt",
          "updatedAt"
        )
        SELECT
          ir.reports_id,
          RIGHT(SPLIT_PART(erp.data->>'eventId','-',1),2)::int,
          erp.data->>'eventId',
          erp.data->>'eventName',
          org.id,
          COALESCE(erp.data->>'trainingType', 'Series')::"enum_ReportTrainingEvents_trainingType",
          erp.data->>'vision',
          erp."createdAt",
          erp."updatedAt"
        FROM "EventReportPilots" erp
        JOIN interim_reports ir
          ON erp.id = pilot_record_id
          AND "reportTypeId" = 1
        JOIN "Organizers" org
          ON erp.data->>'eventOrganizer' = org.name
        ;

        INSERT INTO "ReportTrainingSessions"(
          "reportId",
          "reportTrainingEventId",
          "regionId",
          name,
          "createdAt",
          "updatedAt"
        )
        SELECT
          ir.reports_id,
          ir_events.reports_id,
          (srp.data->>'regionId')::int,
          srp.data->>'eventName',
          srp."createdAt",
          srp."updatedAt"
        FROM "SessionReportPilots" srp
        JOIN interim_reports ir
          ON srp.id = pilot_record_id
          AND ir."reportTypeId" = 2
        JOIN interim_reports ir_events
          ON srp.data->>'eventDisplayId' = ir_events.data->>'eventId'
          AND ir_events."reportTypeId" = 1
        ;

        ------------------------------------------------------------------------------------------------
        ----- REPORT TABLE EXTENSIONS ------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        -- Populate ReportParticipation
        -- Note: "inpersonParticipantCount" & "virtualParticipantCount"
        -- are for future use and aren't populated in pilot TRs
        INSERT INTO "ReportParticipation" (
          "reportId",
          "participantCount",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          (data->>'numberOfParticipants')::int,
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE NULLIF(data->>'numberOfParticipants','') IS NOT NULL
        ;

        -- Populate ReportNextSteps
        -- TODO swap in interpolations
        INSERT INTO "ReportNextSteps" (
          "reportId",
          note,
          "noteType",
          "completedDate",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          data->'recipientNextSteps'->0->>'note',
          'RECIPIENT'::"enum_ReportNextSteps_noteType",
          -- '${NEXTSTEP_NOTETYPE.RECIPIENT}'::"enum_ReportNextSteps_noteType",
          TO_DATE(NULLIF((data->'recipientNextSteps'->0->>'completeDate'),''),'MM/DD/YYYY'),
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE COALESCE((data->'recipientNextSteps'->0->>'note'),'') != ''
        UNION
        SELECT
          reports_id,
          data->'specialistNextSteps'->0->>'note',
          'SPECIALIST'::"enum_ReportNextSteps_noteType",
          -- '${NEXTSTEP_NOTETYPE.SPECIALIST}'::"enum_ReportNextSteps_noteType",
          TO_DATE(NULLIF((data->'specialistNextSteps'->0->>'completeDate'),''),'MM/DD/YYYY'),
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE COALESCE((data->'specialistNextSteps'->0->>'note'),'') != ''
        ;

        -- Populate ReportPageStates
        INSERT INTO "ReportPageStates" (
          "reportId",
          "pageState",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          data->'pageState',
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE data->'pageState' IS NOT NULL
        ;

        -- Populate ReportImports
        INSERT INTO "ReportImports" (
          "reportId",
          data,
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          erp.imported,
          erp."createdAt",
          erp."updatedAt"
        FROM "EventReportPilots" erp
        JOIN interim_reports ir
          ON pilot_record_id = erp.id
        WHERE imported IS NOT NULL
        ;

        ------------------------------------------------------------------------------------------------
        ----- REPORT LINK TABLES -----------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------

        -- Skip ReportApprovals: no approvals for TRs

        -- Reused Collaborator tables
        DROP TABLE IF EXISTS owner_status;
        CREATE TEMP TABLE owner_status
        AS
        SELECT s.id sid
        FROM "Statuses" s
        JOIN "ValidFor" v
          ON s."validForId" = v.id
          AND v.name = 'collaborator'
        WHERE s.name = 'approved' -- TODO: this is terminal, which could lock editing, but the others statuses make even less sense for events
        ;
        DROP TABLE IF EXISTS obj_trainers;
        CREATE TEMP TABLE obj_trainers
        AS
        SELECT
          reports_id rs_id,
          jsonb_array_elements(data->'objectiveTrainers')->>0 nationaltrainer,
          split_part((jsonb_array_elements(data->'objectiveTrainers')->>0), ', ',2) trainername
        FROM interim_reports
        ;

        -- Insert ReportCollaborators
        INSERT INTO "ReportCollaborators" (
          "reportId",
          "userId",
          "statusId",
          note,
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          u.id,
          os.sid,
          'EventReportPilots.data->creator',
          ir."createdAt",
          ir."updatedAt"
        FROM interim_reports ir
        JOIN "Users" u
          ON LOWER(ir.data->>'creator') = LOWER(u.email)
        CROSS JOIN owner_status os
        UNION
        SELECT
          reports_id,
          u.id,
          os.sid,
          'SessionReportPilots.data->objectiveTrainers',
          ir."createdAt",
          ir."updatedAt"
        FROM interim_reports ir
        JOIN obj_trainers ot
          ON ot.rs_id = ir.reports_id
        JOIN "Users" u
          ON LOWER(u.name) = LOWER(ot.trainername)
        CROSS JOIN owner_status os
        ;

        -- Insert ReportCollaboratorRoles
        -- TODO: confirm roles are not relevant in TR context

        -- Insert ReportCollaboratorTypes
        -- TODO: add in the type links

        -- Insert ReportFiles from SessionReportPilotFiles
        INSERT INTO "ReportFiles" (
          "reportId",
          "fileId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          srpf."fileId",
          srpf."createdAt",
          srpf."updatedAt"
        FROM "SessionReportPilotFiles" srpf
        JOIN interim_reports ir
          ON "sessionReportPilotId" = pilot_record_id
          AND "reportTypeId" = 2
        ;

        -- Insert ReportNationalCenters
        INSERT INTO "ReportNationalCenters" (
          "reportId",
          "nationalCenterId",
          "actingAs",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          nc.id,
          'trainer',
          ir."createdAt",
          ir."updatedAt"
        FROM interim_reports ir
        JOIN obj_trainers ot
          ON ot.rs_id = ir.reports_id
        JOIN "NationalCenters" nc
          ON ot.nationaltrainer = nc.name
        ;

        -- Insert ReportReasons
        INSERT INTO "ReportReasons" (
          "reportId",
          "reasonId",
          "createdAt",
          "updatedAt"
        )
        WITH reasonparts AS (
          SELECT
            reports_id rs_id,
            jsonb_array_elements(data->'reasons') rp
          FROM interim_reports
          WHERE data->'reasons' IS NOT NULL
        ),
        joined_reasons AS (
          SELECT
            rs_id,
            string_agg(rp->>0,' | ') jr
          FROM reasonparts
          WHERE rp->>0 != ''
          GROUP BY 1
        ),
        reclipped_reasons AS (
          SELECT
            rs_id,
            UNNEST(string_to_array(jr,E'\n')) rr
          FROM joined_reasons
        ),
        corrected_reasons AS (
          SELECT
            rs_id,
            CASE rr
              WHEN 'New Staff/Turnover' THEN 'New Staff / Turnover'
              WHEN 'Child Incidents' THEN 'Child Incident'
              WHEN 'New Program/Option' THEN 'New Program Option'
              ELSE rr
            END AS reason
          FROM reclipped_reasons 
        )
        SELECT
          reports_id,
          r.id,
          ir."createdAt",
          ir."updatedAt"
        FROM interim_reports ir
        JOIN corrected_reasons cr
          ON reports_id = rs_id
        JOIN "Reasons" r
          ON cr.reason = r.name
        ;

        -- Insert ReportTargetPopulations
        INSERT INTO "ReportTargetPopulations" (
          "reportId",
          "targetPopulationId",
          "createdAt",
          "updatedAt"
        )
        WITH unnested_target_populations AS (
        SELECT
          reports_id,
          "createdAt",
          "updatedAt",
          UNNEST(
            string_to_array(jsonb_array_elements_text(data->'targetPopulations'),E'\n')
          ) target_population_name
        FROM interim_reports erp
        )
        SELECT
          reports_id,
          tp.id,
          utp."createdAt",
          utp."updatedAt"
        FROM "TargetPopulations" tp
        JOIN unnested_target_populations utp
          ON tp.name = utp.target_population_name
        ;
        
        -- Insert ReportRecipients
        INSERT INTO "ReportRecipients" (
          "reportId",
          "grantId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          ((jsonb_array_elements(data->'recipients'))->>'value')::bigint,
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE data->'recipients' IS NOT NULL
        ;

        ------------------------------------------------------------------------------------------------
        ----- OBJECTIVES -------------------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        -- Find or insert Objectives for sessions
        CREATE TEMP TABLE session_objectives
        AS
        WITH objstats AS (
          SELECT
            notstart.name notstartstat,
            inprog.name inprogstat
          FROM "ValidFor" vf
          JOIN "Statuses" notstart
            ON notstart.ordinal = 1
            AND vf.id = notstart."validForId"
          JOIN "Statuses" inprog
            ON inprog.ordinal = 2
            AND vf.id = inprog."validForId"
          WHERE vf.name = 'objective'
        )
        SELECT
          reports_id rid,
          NULL::bigint AS oid,
          data->>'objective' otitle,
          data->>'ttaProvided' ttaprovided,
          s.id sid,
          s.ordinal,
          CASE WHEN s."isTerminal" THEN os.inprogstat ELSE os.notstartstat END AS status,
          ir."createdAt" created_at,
          ir."updatedAt" updated_at,
          BOOL_AND(o.id IS NULL) to_insert
        FROM interim_reports ir
        JOIN "Reports" r
          ON ir.reports_id = r.id
        JOIN "Statuses" s
          ON r."statusId" = s.id
        JOIN "ReportRecipients" rr
          ON r.id = rr."reportId"
        LEFT JOIN "Goals" g
          ON g."grantId" = rr."grantId"
        LEFT JOIN "Objectives" o
          ON g.id = o."goalId"
          AND TRIM(LOWER(data->>'objective')) = TRIM(LOWER(o.title))
        CROSS JOIN objstats os
        GROUP BY 1,2,3,4,5,6,7,8,9
        ;
        CREATE TEMP TABLE 
        INSERT INTO "Objectives" (
          title,
          status,
          "createdAt",
          "updatedAt"
        )
        SELECT
          otitle,
          status,
          created_at,
          updated_at
        FROM session_objectives
        WHERE to_insert
        ;

        
        /*
        UPDATE session_objectives
        SET oid = o.id
        FROM "Objectives" o
        JOIN "
        WHERE TRIM(LOWER(title)) = TRIM(LOWER(otitle))


        
        -- Insert ReportObjectives TODO
        INSERT INTO "ReportObjectives" (
          reportId,
          objectiveId,
          title,
          "statusId",
          ordinal,
          "ttaProvided"
          "createdAt",
          "updatedAt"
        )
        SELECT
          otitle,
          oid,
          t
          status,
          created_at,
          updated_at
        FROM session_objectives
        WHERE to_insert
        */

        
        -- Insert ObjectiveTopics TODO
        -- Insert ObjectiveFiles TODO
        -- Insert ObjectiveResources TODO
        -- Find or insert ObjectiveTemplates text for region on complete session TODO
        -- Insert ObjectiveTemplateTopics TODO
        -- Insert ObjectiveTemplateResources TODO


        ------------------------------------------------------------------------------------------------
        ----- GOALS ------------------------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        -- Find or insert GoalTemplates text for region
        -- There's really only the one goal in recent data, so not getting real fancy on the deduping logic here
        INSERT INTO "GoalTemplates" (
          hash,
          "templateName",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateNameModifiedAt"
        )
        WITH newgoaltexts AS (
          SELECT
            rte."regionId",
            TRIM(LOWER(data->>'goal')) newgoaltext
          FROM interim_reports ir
          JOIN "ReportTrainingEvents" rte
            ON ir.reports_id = rte."reportId"
          WHERE NULLIF((data->>'goal'),'') IS NOT NULL
          EXCEPT
          SELECT
            "regionId",
            TRIM(LOWER("templateName"))
          FROM "GoalTemplates"
        )
        SELECT
          MD5(data->>'goal'),
          data->>'goal',
          rte."regionId",
          'Automatic', -- TODO: check if this should be considered a Curated goal
          ir."createdAt",
          ir."updatedAt",
          ir."updatedAt",
          ir."createdAt"
        FROM interim_reports ir
        JOIN "ReportTrainingEvents" rte
          ON ir.reports_id = rte."reportId"
        JOIN newgoaltexts n
          ON TRIM(LOWER(ir.data->>'goal')) = newgoaltext
          AND n."regionId" = rte."regionId"
        ;

        -- Insert ReportGoalTemplates TODO

        -- Create Goals for session Grants
        CREATE TEMP TABLE goals_to_insert
        AS
        WITH goalstats AS (
          SELECT
            inprog.name inprogstat
          FROM "ValidFor" vf
          JOIN "Statuses" inprog
            ON inprog.ordinal = 3
            AND vf.id = inprog."validForId"
          WHERE vf.name = 'goal'
        )
        SELECT
          r.id rid
          gt."templateName" gname,
          gs.inprogstat status,
          r."createdAt" created_at,
          r."updatedAt" updated_at,
          gt.id, gtid
          rr."grantId" grid
        FROM "ReportTrainingSessions" rts
        JOIN interim_reports ir_event
          ON rts."reportTrainingEventId" = ir_event.reports_id
        JOIN "Reports" r
          ON rts."reportId" = r.id
        JOIN "Statuses" s
          ON r."statusId" = s.id
        JOIN "ReportRecipients" rr
          ON rr."reportId" = r.id
        JOIN "GoalTemplates" gt
          ON TRIM(LOWER(gt."templateName")) = TRIM(LOWER(ir_event.data->>'goal'))
          AND rts."regionId" = gt."regionId"
        CROSS JOIN goalstats gs
        WHERE s."isTerminal"
        ;

        INSERT INTO "Goals" (
          name,
          status,
          "isFromSmartsheetTtaPlan",
          "createdAt",
          "updatedAt",
          "goalTemplateId",
          "grantId",
          "firstInProgressAt"
          -- ,"createdVia" -- TODO: should it import using 'imported'? (leaning toward yes)
          -- ,"source" -- TODO: should we add and use 'Training event'? (leaning toward no)
        )
        SELECT
          gname,
          status,
          FALSE,
          created_at,
          updated_at,
          gtid,
          grid,
          created_at"
        FROM goals_to_insert gti
        ;

        -- Insert ReportGoals TODO
        -- Update Objectives with goalId TODO
        -- Insert GoalTemplateObjectiveTemplates TODO



        /*
        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        */




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
