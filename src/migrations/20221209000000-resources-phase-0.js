/* eslint-disable max-len */
// Resources Phase 0: Clean current "ObjectiveResources" and "ActivityReportObjectiveResources" to have each record contain a single value url.
module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    const loggedUser = '0';
    const sessionSig = __filename;
    const auditDescriptor = 'RUN MIGRATIONS';
    await queryInterface.sequelize.query(
      `SELECT
          set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
          set_config('audit.transactionId', NULL, TRUE) as "transactionId",
          set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
          set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
      { transaction },
    );

    // clean "ObjectiveResources"
    // Some the the issues can be solved with known lookup and replace, this will repopulate valid urls over invalid data.
    // This will allow them to keep the data they would otherwise have lost by manually looking up the url based on the supplied page title.
    const fixListObjectiveResources = [
      { id: 166, data: 'https://eclkc.ohs.acf.hhs.gov/program-planning/home-visitor-supervisors-handbook/home-visitor-supervisors-handbook https://eclkc.ohs.acf.hhs.gov/human-resources/home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledge-skills' },
      { id: 168, data: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-act/sec-648a-staff-qualifications-development' },
      { id: 252, data: 'https://eclkc.ohs.acf.hhs.gov/about-us/article/head-start-work-heart-work-ohs-priorities' },
      { id: 555, data: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance' },
      { id: 680, data: 'https://eclkc.ohs.acf.hhs.gov/publication/guiding-questions-active-supervision-safety' },
      { id: 774, data: 'http://www.teachstone.com' },
      { id: 775, data: 'http://www.teachstone.com' },
      { id: 776, data: 'http://www.teachstone.com' },
      { id: 779, data: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc https://eclkc.ohs.acf.hhs.gov/publication/practice-based-coaching-pbc-coach-competencies' },
      { id: 782, data: 'https://eclkc.ohs.acf.hhs.gov/publication/practice-based-coaching-pbc-coach-competencies' },
      { id: 789, data: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-healing-adults' },
      { id: 934, data: 'https://eclkc.ohs.acf.hhs.gov/family-support-well-being/article/taking-care-ourselves-stress-relaxation' },
      { id: 1799, data: 'https://eclkc.ohs.acf.hhs.gov/program-planning/foundations-excellence/foundations-excellence' },
      { id: 1800, data: 'https://eclkc.ohs.acf.hhs.gov/program-planning/foundations-excellence/foundations-excellence' },
      { id: 2085, data: 'https://eclkc.ohs.acf.hhs.gov/fiscal-management/article/comparability-wages' },
      { id: 2087, data: 'https://youtu.be/u4ZoJKF_VuA' },
      { id: 2594, data: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance' },
      { id: 2595, data: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework' },
      { id: 2596, data: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage' },
      { id: 2598, data: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance' },
      { id: 2599, data: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework' },
      { id: 2600, data: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage' },
      { id: 2729, data: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/coaching-corner-series https://cultivatelearning.uw.edu/circle-time-magazine/' },
      { id: 9265, data: 'http://www.federalregister.gov/documents/2019/11/26/2019-25634/head-start-program' },
      { id: 9328, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9329, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9330, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9331, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9332, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9333, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9334, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
      { id: 9335, data: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710' },
    ];

    await Promise.all(fixListObjectiveResources.map(async (fi) => queryInterface.sequelize.query(`
    UPDATE "ObjectiveResources"
    SET "userProvidedUrl" = '${fi.data}'
    WHERE id = ${fi.id};
    `, { transaction })));

    // clean "ActivityReportObjectiveResources"
    const fixListActivityReportObjectiveResources = [
    // TODO
    ];

    await Promise.all(fixListActivityReportObjectiveResources.map(async (fi) => queryInterface.sequelize.query(`
    UPDATE "ActivityReportObjectiveResources"
    SET "userProvidedUrl" = '${fi.data}'
    WHERE id = ${fi.id};
    `, { transaction })));

    const urlRegex = '(?:(?:http|ftp|https|file):\\/\\/)(?:www\\.)?(?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:]))(?:[\\w\\\\\'\'.,@?^=%&:\\/~+#()-]*[\\w@?^=%&\\/~+#-])';

    // clean "ObjectiveResources"
    // Now that the table has had the correctable values fixed, corrections need to be applied to return the table to its expected structure.
    // 1. Find all urls in the current data using regex
    // 2. Generate a list of records with distinct urls where the current value has some data other then just the url found.
    // 3. Generate a list of counts urls per record id.
    // 4. Update records that only contain one url to be only the url.
    // 5. Insert new records into the table for all records that have multiple urls per record.
    // 6. Delete the original record that contained multiple urls used in step five.
    // 7. Generate a list of all malformed data that does not contain a url.
    // 8. Delete all malformed records identified in step seven.
    // 9. Collect all records that have been affected.
    // 10. Return statistics form operation.
    await queryInterface.sequelize.query(`
    WITH
        "ObjectiveResourcesURLs" AS (
            SELECT
                id,
                (regexp_matches("userProvidedUrl",'${urlRegex}','g')) urls,
                "userProvidedUrl",
                "objectiveId",
                "createdAt",
                "updatedAt",
                "onAR",
                "onApprovedAR"
            FROM "ObjectiveResources"
        ),
        "ObjectiveResourcesSource" AS (
            SELECT
                ru.id,
                u.url,
                ru."userProvidedUrl",
                ru."objectiveId",
                ru."createdAt",
                ru."updatedAt",
                ru."onAR",
                ru."onApprovedAR"
            FROM "ObjectiveResources" r
            JOIN "ObjectiveResourcesURLs" ru
            ON r.id = ru.id
            CROSS JOIN UNNEST(ru.urls) u(url)
            WHERE r."userProvidedUrl" like '%' || u.url || '%'
            AND trim(r."userProvidedUrl") != u.url
            ORDER BY r.id
        ),
        "ObjectiveResourcesCounts" AS (
            SELECT
                id,
                count(url) cnt
            FROM "ObjectiveResourcesSource"
            GROUP BY id
        ),
        "UpdateObjectiveResources" AS (
            UPDATE "ObjectiveResources" "or"
            SET
                "userProvidedUrl" = ors.url
            FROM "ObjectiveResourcesSource" ors
            JOIN "ObjectiveResourcesCounts" orc
            ON ors.id = orc.id
            WHERE "or".id = ors.id
            AND orc.cnt = 1
            RETURNING
                id "objectiveResourceId"
        ),
        "NewObjectiveResources" AS (
            INSERT INTO "ObjectiveResources" (
                "userProvidedUrl",
                "objectiveId",
                "createdAt",
                "updatedAt",
                "onAR",
                "onApprovedAR"
            )
            SELECT
                ors.url "userProvidedUrl",
                ors."objectiveId",
                ors."createdAt",
                ors."updatedAt",
                ors."onAR",
                ors."onApprovedAR"
            FROM "ObjectiveResourcesSource" ors
            JOIN "ObjectiveResourcesCounts" orc
            ON ors.id = orc.id
            WHERE orc.cnt != 1
            RETURNING
                id "objectiveResourceId"
        ),
        "DeleteObjectiveResources" AS (
            DELETE FROM "ObjectiveResources" "or"
            USING "ObjectiveResourcesCounts" orc
            WHERE "or".id = "orc".id
            AND orc.cnt != 1
            RETURNING
                id "objectiveResourceId"
        ),
        "MalformedObjectiveResources" AS (
            SELECT
                r.id
            FROM "ObjectiveResources" r
            LEFT JOIN "ObjectiveResourcesURLs" ru
            ON r.id = ru.id
            WHERE ru.id IS NULL
        ),
        "DeleteMalformedObjectiveResources" AS (
            DELETE FROM "ObjectiveResources" "or"
            USING "MalformedObjectiveResources" mor
            WHERE "or".id = "mor".id
            RETURNING
                id "objectiveResourceId"
        ),
        "AffectedObjectiveResources" AS (
          SELECT
            "objectiveResourceId",
            'updated' "action"
          FROM "UpdateObjectiveResources"
          UNION
          SELECT
            "objectiveResourceId",
            'created' "action"
          FROM "NewObjectiveResources"
          UNION
          SELECT
            "objectiveResourceId",
            'replaced' "action"
          FROM "DeleteObjectiveResources"
          UNION
          SELECT
            "objectiveResourceId",
            'removed' "action"
          FROM "DeleteMalformedObjectiveResources"
        )
        SELECT
          "action",
          count("objectiveResourceId")
        FROM "AffectedObjectiveResources"
        GROUP BY "action";
    `, { transaction });

    // clean "ActivityReportObjectiveResources"
    // TODO
  }),
};
