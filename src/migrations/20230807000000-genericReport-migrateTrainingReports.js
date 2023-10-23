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

      await queryInterface.sequelize.query(/* sql */`
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
        -- REMOVE: Insert ReportCollaboratorRoles
        -- Insert ReportCollaboratorTypes
        -- Insert ReportFiles from SessionReportPilotFiles
        -- Insert ReportNationalCenters
        -- Insert ReportReasons
        -- Insert ReportTargetPopulations
        -- Insert ReportRecipients
        -- Insert ReportAudiences
        ----- OBJECTIVES ------
        -- REMOVE: Find or insert Objectives for sessions
        -- REMOVE: Insert ObjectiveTopics
        -- REMOVE: Insert ObjectiveFiles
        -- REMOVE: Insert ObjectiveResources
        -- Find or insert ObjectiveTemplates text for region on created session
        -- Insert ObjectiveTemplateTopics
        -- Insert ObjectiveTemplateResources
        ----- GOALS ------
        -- Find or insert GoalTemplates text for region
        -- Insert ReportGoalTemplates
        -- REMOVE: Find or insert Goals for session Grants
        -- REMOVE: Insert ReportGoals
        -- REMOVE: Update Objectives with goalId
        -- Insert GoalTemplateObjectiveTemplates
        -- Update ReportObjectiveTemplates.reportGoalTemplateId


        ------------------------------------------------------------------------------------------------
        ----- Populate dimensional tables --------------------------------------------------------------
        ------------------------------------------------------------------------------------------------

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
        CREATE TEMP TABLE interim_reports
        AS
        SELECT
          erp.id pilot_record_id,
          1 "reportTypeId", -- the 'report.trainingEvent' ID in ValidFor
          s.id "statusId",
          erp.data->>'Sheet Name' context,
          to_date(NULLIF(erp.data->>'startDate',''),'MM/DD/YYYY') "startDate",
          to_date(NULLIF(erp.data->>'endDate',''),'MM/DD/YYYY') "endDate",
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
          to_date(NULLIF(srp.data->>'startDate',''),'MM/DD/YYYY') "startDate",
          to_date(NULLIF(srp.data->>'endDate',''),'MM/DD/YYYY') "endDate",
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
          duration,
          name,
          "createdAt",
          "updatedAt"
        )
        SELECT
          ir.reports_id,
          ir_events.reports_id,
          (srp.data->>'regionId')::int,
          (srp.data->>'duration')::DECIMAL,
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
          "deliveryMethod",
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          (data->>'numberOfParticipants')::int,
          (data->>'deliveryMethod')::"enum_ReportParticipation_deliveryMethod",
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE NULLIF(data->>'numberOfParticipants','') IS NOT NULL
        ;

        -- Populate ReportNextSteps
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
          '${NEXTSTEP_NOTETYPE.RECIPIENT}'::"enum_ReportNextSteps_noteType",
          TO_DATE(NULLIF((data->'recipientNextSteps'->0->>'completeDate'),''),'MM/DD/YYYY'),
          "createdAt",
          "updatedAt"
        FROM interim_reports
        WHERE COALESCE((data->'recipientNextSteps'->0->>'note'),'') != ''
        UNION
        SELECT
          reports_id,
          data->'specialistNextSteps'->0->>'note',
          '${NEXTSTEP_NOTETYPE.SPECIALIST}'::"enum_ReportNextSteps_noteType",
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

        -- Reused Collaborator table
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
        CREATE TEMP TABLE collaborators
        AS
        SELECT
          reports_id,
          u.id uid,
          'EventReportPilots.data->creator' sourcepath,
          ir."createdAt" created_at,
          ir."updatedAt" updated_at
        FROM interim_reports ir
        JOIN "Users" u
          ON LOWER(ir.data->>'creator') = LOWER(u.email)
        UNION
        SELECT
          reports_id,
          u.id,
          'SessionReportPilots.data->objectiveTrainers',
          ir."createdAt",
          ir."updatedAt"
        FROM interim_reports ir
        JOIN obj_trainers ot
          ON ot.rs_id = ir.reports_id
        JOIN "Users" u
          ON LOWER(u.name) = LOWER(ot.trainername)
        ;

        INSERT INTO "ReportCollaborators" (
          "reportId",
          "userId",
          note,
          "createdAt",
          "updatedAt"
        )
        SELECT
          reports_id,
          uid,
          'sources: ' || STRING_AGG(sourcepath,'+'),
          created_at,
          updated_at
        FROM collaborators c
        GROUP BY 1,2,4,5
        ;

        -- Insert ReportCollaboratorTypes
        -- Note: creators just become owners on every report
        -- so 'owner' and 'creator' aren't actually separate for TRs
        INSERT INTO "ReportCollaboratorTypes" (
          "reportCollaboratorId",
          "collaboratorTypeId",
          "createdAt",
          "updatedAt"
        )
        WITH ctypes AS (
          SELECT
            ec.id event_ctypeid,
            sc.id sess_ctypeid
          FROM "CollaboratorTypes" ec
          JOIN "CollaboratorTypes" sc
            ON ec.name = 'owner'
            AND ec."validForId" = 1
            AND sc.name = 'instantiator'
            AND sc."validForId" = 2
        )
        SELECT
          rc.id,
          CASE sourcepath
            WHEN 'SessionReportPilots.data->objectiveTrainers' THEN ct.sess_ctypeid
            WHEN 'EventReportPilots.data->creator' THEN ct.event_ctypeid
          END,
          c.created_at,
          c.updated_at
        FROM collaborators c
        JOIN "ReportCollaborators" rc
          ON c.reports_id = rc."reportId"
          AND c.uid = rc."userId"
        CROSS JOIN ctypes ct
        ;

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

        -- Insert ReportAudiences
        INSERT INTO "ReportAudiences" (
          "reportId",
          "audienceId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          ir.reports_id,
          a.id,
          ir."createdAt",
          ir."updatedAt"
        FROM interim_reports ir
        JOIN "Audiences" a
          ON ir.data->>'audience' = a.name
          AND a."validForId" = 1
        ;

        ------------------------------------------------------------------------------------------------
        ----- OBJECTIVES -------------------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        -- Find or insert ObjectiveTemplates for sessions

        CREATE TEMP TABLE obj_templates
        AS
        WITH existing_objtemplates AS (
          SELECT DISTINCT
            id,
            "regionId",
            TRIM(LOWER("templateTitle")) ottitle
          FROM "ObjectiveTemplates"
        )
        SELECT
          ir.reports_id,
          eo.id::bigint otid,
          MD5(data->>'objective') hash,
          data->>'objective' ottitle,
          data->>'objectiveSupportType' support_type,
          rts."regionId",
          ir."createdAt",
          ir."updatedAt",
          CASE WHEN eo.id IS NULL THEN TRUE ELSE FALSE END AS to_insert
        FROM interim_reports ir
        JOIN "ReportTrainingSessions" rts
          ON ir.reports_id = rts."reportId"
        LEFT JOIN existing_objtemplates eo
          ON TRIM(LOWER(ir.data->>'objective')) = eo.ottitle
          AND eo."regionId" = rts."regionId"
        WHERE NULLIF(COALESCE(ir.data->>'objective',''),'') IS NOT NULL
        ;

        INSERT INTO "ObjectiveTemplates" (
          hash,
          "templateTitle",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateTitleModifiedAt"
        )
        SELECT
          hash,
          ottitle,
          "regionId",
          'Automatic',
          "createdAt",
          "updatedAt",
          "updatedAt",
          "createdAt"
        FROM obj_templates o_t
        WHERE to_insert
        ;

        -- Insert ReportObjectiveTemplates
        INSERT INTO "ReportObjectiveTemplates" (
          "reportId",
          "objectiveTemplateId",
          "templateTitle",
          "supportTypeId",
          "statusId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          r.id,
          ot.id,
          o_t.ottitle,
          st.id,
          r."statusId",
          r."createdAt",
          r."updatedAt"
        FROM obj_templates o_t
        JOIN "Reports" r
          ON o_t.reports_id = r.id
        JOIN "ObjectiveTemplates" ot
          ON TRIM(LOWER(o_t.ottitle)) = TRIM(LOWER(ot."templateTitle"))
          AND o_t."regionId" = ot."regionId"
        JOIN "SupportTypes" st
          ON COALESCE(o_t.support_type,'Introducing') = st.name
        ;

        -- Insert ObjectiveTemplateTopics
        INSERT INTO "ObjectiveTemplateTopics" (
          "objectiveTemplateId",
          "topicId",
          "createdAt",
          "updatedAt"
        )
        WITH topicnames AS (
          SELECT
            reports_id,
            jsonb_array_elements(data->'objectiveTopics')->>0 tname
          FROM interim_reports
          WHERE data->>'objective' != ''
        )
        SELECT
          ot.id,
          t.id,
          ot."createdAt",
          ot."updatedAt"
        FROM obj_templates o_t
        JOIN topicnames tn
          ON o_t.reports_id = tn.reports_id
        JOIN "Topics" t
          ON tn.tname = t.name
        JOIN "ObjectiveTemplates" ot
          ON TRIM(LOWER(o_t.ottitle)) = TRIM(LOWER(ot."templateTitle"))
          AND o_t."regionId" = ot."regionId"
        ;
        -- Insert ObjectiveTemplateResources
        -- first need a list of resources and whether they need to be added
        -- there is not expected to be any new resources, but this is due-diligence
        CREATE TEMP TABLE tr_resources
        AS
        WITH separated_resources AS (
          SELECT
            ir.reports_id,
            jsonb_array_elements(ir.data->'objectiveResources')->>'value' url,
            SPLIT_PART((jsonb_array_elements(ir.data->'objectiveResources')->>'value'),'/',3) AS domain
          FROM interim_reports ir
          WHERE ir.data->>'objective' != ''
        )
        SELECT
          sr.reports_id,
          sr.url,
          sr.domain,
          CASE WHEN r.id IS NULL THEN TRUE ELSE FALSE END to_insert
        FROM separated_resources sr
        LEFT JOIN "Resources" r
          ON sr.url = r.url
        ;

        INSERT INTO "Resources" (
          url,
          domain,
          "createdAt",
          "updatedAt"
        )
        SELECT DISTINCT
          url,
          domain,
          "createdAt",
          "updatedAt"
        FROM tr_resources tr
        JOIN interim_reports ir
          ON ir.reports_id = tr.reports_id
        WHERE to_insert
        ;

        INSERT INTO "ObjectiveTemplateResources" (
          "objectiveTemplateId",
          "resourceId",
          "sourceFields",
          "createdAt",
          "updatedAt"
        )
        SELECT
          ot.id,
          r.id,
          '{resource}',
          ot."createdAt",
          ot."updatedAt"
        FROM obj_templates o_t
        JOIN tr_resources tr
          ON o_t.reports_id = tr.reports_id
        JOIN "Resources" r
          ON tr.url = r.url
        JOIN "ObjectiveTemplates" ot
          ON TRIM(LOWER(o_t.ottitle)) = TRIM(LOWER(ot."templateTitle"))
          AND o_t."regionId" = ot."regionId"
        ;


        ------------------------------------------------------------------------------------------------
        ----- GOALS ------------------------------------------------------------------------------------
        ------------------------------------------------------------------------------------------------
        -- Find or insert GoalTemplates text for region
        -- There's really only the one goal in recent data, so not getting real fancy on the deduping logic here
        CREATE TEMP TABLE goal_templates
        AS
        WITH existing_goaltemplates AS (
          SELECT DISTINCT
            id,
            "regionId",
            TRIM(LOWER("templateName")) gtname
          FROM "GoalTemplates"
        )
        SELECT
          ir.reports_id,
          eg.id::bigint gtid,
          MD5(data->>'goal') hash,
          data->>'goal' gtname,
          rte."regionId",
          ir."createdAt",
          ir."updatedAt",
          CASE WHEN eg.id IS NULL THEN TRUE ELSE FALSE END AS to_insert
        FROM interim_reports ir
        JOIN "ReportTrainingEvents" rte
          ON ir.reports_id = rte."reportId"
        LEFT JOIN existing_goaltemplates eg
          ON TRIM(LOWER(ir.data->>'goal')) = eg.gtname
          AND eg."regionId" = rte."regionId"
        WHERE NULLIF(COALESCE(ir.data->>'goal',''),'') IS NOT NULL
        ;

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
        SELECT
          hash,
          gtname,
          "regionId",
          'Automatic',
          "createdAt",
          "updatedAt",
          "updatedAt",
          "createdAt"
        FROM goal_templates g_t
        WHERE to_insert
        ;

        -- Insert ReportGoalTemplates
        INSERT INTO "ReportGoalTemplates" (
          "reportId",
          "goalTemplateId",
          "templateName",
          "statusId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          r.id,
          gt.id,
          g_t.gtname,
          r."statusId",
          r."createdAt",
          r."updatedAt"
        FROM goal_templates g_t
        JOIN "Reports" r
          ON g_t.reports_id = r.id
        JOIN "GoalTemplates" gt
          ON TRIM(LOWER(g_t.gtname)) = TRIM(LOWER(gt."templateName"))
          AND g_t."regionId" = gt."regionId"
        ;

        -- Insert GoalTemplateObjectiveTemplates
        INSERT INTO "GoalTemplateObjectiveTemplates" (
          "goalTemplateId",
          "objectiveTemplateId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          rgt."goalTemplateId",
          rot."objectiveTemplateId",
          rts."createdAt",
          rts."updatedAt"
        FROM "ReportObjectiveTemplates" rot
        JOIN "ReportTrainingSessions" rts
          ON rot."reportId" = rts."reportId"
        JOIN "ReportGoalTemplates" rgt
          ON rts."reportTrainingEventId" = rgt."reportId"
        ;

        -- Update ReportObjectiveTemplates.reportGoalTemplateId
        UPDATE "ReportObjectiveTemplates" AS rot
        SET "reportGoalTemplateId" = rgt.id
        FROM "GoalTemplateObjectiveTemplates" gtot
        JOIN "ReportGoalTemplates" rgt
          ON gtot."goalTemplateId" = rgt."goalTemplateId"
        WHERE rot."objectiveTemplateId" = gtot."objectiveTemplateId"
        ;`, { transaction });
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
