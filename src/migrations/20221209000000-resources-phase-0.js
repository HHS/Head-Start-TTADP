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
      {
        id: 166,
        old: 'https://eclkc.ohs.acf.hhs.gov/humanresources/ home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledgeskills',
        new: 'https://eclkc.ohs.acf.hhs.gov/program-planning/home-visitor-supervisors-handbook/home-visitor-supervisors-handbook https://eclkc.ohs.acf.hhs.gov/human-resources/home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledge-skills',
      },
      {
        id: 168,
        old: 'https://eclkc.ohs.acf.hhs.gov/policy/headstart- act/sec-648a-staff-qualifications-development',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-act/sec-648a-staff-qualifications-development',
      },
      {
        id: 252,
        old: 'Head Start Work Is Heart Work: OHS Priorities | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/about-us/article/head-start-work-heart-work-ohs-priorities',
      },
      {
        id: 555,
        old: '1302 Subpart A—Eligibility, Recruitment, Selection, Enrollment, and Attendance | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        id: 680,
        old: 'Guiding Questions for Active Supervision and Safety | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/guiding-questions-active-supervision-safety',
      },
      {
        id: 774,
        old: 'www.teachstone.com',
        new: 'http://www.teachstone.com',
      },
      {
        id: 775,
        old: 'www.teachstone.com',
        new: 'http://www.teachstone.com',
      },
      {
        id: 776,
        old: 'www.teachstone.com',
        new: 'http://www.teachstone.com',
      },
      {
        id: 779,
        old: 'Practice-Based Coaching (PBC) | ECLKC (hhs.gov)  The Practice-Based Coaching Coach Competencies (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc https://eclkc.ohs.acf.hhs.gov/publication/practice-based-coaching-pbc-coach-competencies',
      },
      {
        id: 782,
        old: 'The Practice-Based Coaching Coach Competencies (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/practice-based-coaching-pbc-coach-competencies',
      },
      {
        id: 789,
        old: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-  healing-adults',
        data: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-healing-adults',
      },
      {
        id: 934,
        old: 'Taking Care of Ourselves: Stress and Relaxation | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-support-well-being/article/taking-care-ourselves-stress-relaxation',
      },
      {
        id: 1799,
        old: 'Foundations for Excellence | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/program-planning/foundations-excellence/foundations-excellence',
      },
      {
        id: 1800,
        old: 'Foundations for Excellence | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/program-planning/foundations-excellence/foundations-excellence',
      },
      {
        id: 2085,
        old: 'Comparability of Wages | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/fiscal-management/article/comparability-wages',
      },
      {
        id: 2087,
        old: 'Start with why -- how great leaders inspire action | Simon Sinek | TEDxPugetSound - YouTube',
        new: 'https://youtu.be/u4ZoJKF_VuA',
      },
      {
        id: 2594,
        old: '1302 Subpart E—Family and Community Engagement Program Services | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        id: 2595,
        old: 'Parent, Family, and Community Engagement (PFCE) Framework | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework',
      },
      {
        id: 2596,
        old: 'Journeys of Hope and Courage | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage',
      },
      {
        id: 2598,
        old: 'http://1302 Subpart E—Family and Community Engagement Program Services | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        id: 2599,
        old: 'http://Parent, Family, and Community Engagement (PFCE) Framework | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework',
      },
      {
        id: 2600,
        old: 'http://Journeys of Hope and Courage | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage',
      },
      {
        id: 2729,
        old: 'Coaching Corner Series | ECLKC (hhs.gov), Circle Time Magazine - Cultivate Learning (uw.edu) ',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/coaching-corner-series https://cultivatelearning.uw.edu/circle-time-magazine/',
      },
      {
        id: 9265,
        old: 'www.federalregister.gov/documents/2019/11/26/2019-25634/head-start-program',
        new: 'http://www.federalregister.gov/documents/2019/11/26/2019-25634/head-start-program',
      },
      {
        id: 9328,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9329,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9330,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9331,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9332,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9333,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9334,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 9335,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 12220,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12223,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12226,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12229,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12232,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12235,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12238,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12241,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 12566,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12566,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12568,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12570,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12572,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12574,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12577,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12579,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12581,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12583,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12585,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 12642,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12643,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12644,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12645,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12646,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12647,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12648,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12649,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12650,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12651,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12652,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12653,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12654,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12655,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12656,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 12657,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
    ];

    await Promise.all(fixListObjectiveResources.map(async (fi) => queryInterface.sequelize.query(`
    UPDATE "ObjectiveResources"
    SET "userProvidedUrl" = '${fi.new}'
    WHERE id = ${fi.id}
    AND "userProvidedUrl" = '${fi.old}';
    `, { transaction })));

    // clean "ActivityReportObjectiveResources"
    const fixListActivityReportObjectiveResources = [
      {
        id: 152,
        old: 'https://eclkc.ohs.acf.hhs.gov/humanresources/ home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledgeskills',
        new: 'https://eclkc.ohs.acf.hhs.gov/program-planning/home-visitor-supervisors-handbook/home-visitor-supervisors-handbook https://eclkc.ohs.acf.hhs.gov/human-resources/home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledge-skills',
      },
      {
        id: 154,
        old: 'https://eclkc.ohs.acf.hhs.gov/policy/headstart- act/sec-648a-staff-qualifications-development',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-act/sec-648a-staff-qualifications-development',
      },
      {
        id: 166,
        old: 'http://1302 Subpart E—Family and Community Engagement Program Services | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        id: 168,
        old: 'http://Parent, Family, and Community Engagement (PFCE) Framework | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework',
      },
      {
        id: 252,
        old: 'http://Journeys of Hope and Courage | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage',
      },
      {
        id: 780,
        old: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-  healing-adults',
        data: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-healing-adults',
      },
      {
        id: 2272,
        old: 'https://nrckids.org/files/CFOC4 pdf- FINAL.pdf',
        data: 'https://nrckids.org/files/CFOC4%20pdf-%20FINAL.pdf',
      },
      {
        id: 2466,
        old: 'http://1302 Subpart E—Family and Community Engagement Program Services | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        id: 2467,
        old: 'http://Parent, Family, and Community Engagement (PFCE) Framework | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework',
      },
      {
        id: 2468,
        old: 'http://Journeys of Hope and Courage | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage',
      },
      {
        id: 10585,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10586,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10587,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10588,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10589,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10590,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10591,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 10592,
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        id: 11957,
        old: 'http://eclkc.ohs.hhs.gov/45CFR 1302.11(b)(2) Community Assessment: The Foundation for Program Planning',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-11-determining-community-strengths-needs-resources https://eclkc.ohs.acf.hhs.gov/program-planning/community-assessment-foundation-program-planning-head-start/community-assessment-foundation-program-planning-head-start',
      },
      {
        id: 12404,
        old: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-102-achieving-program-goals	',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-102-achieving-program-goals',
      },
      {
        id: 12699,
        old: 'http://eclkc.ohs.hhs.gov/45CFR 1302.11(b)(2) Community Assessment: The Foundation for Program Planning',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-11-determining-community-strengths-needs-resources https://eclkc.ohs.acf.hhs.gov/program-planning/community-assessment-foundation-program-planning-head-start/community-assessment-foundation-program-planning-head-start',
      },
      {
        id: 13026,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13029,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13032,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13035,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13038,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13041,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13044,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13047,
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        id: 13378,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 13380,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 13382,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 13384,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 13385,
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        id: 13459,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13460,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13461,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13462,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13463,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13464,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13465,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13466,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13467,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13468,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13469,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13470,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13471,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13472,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13473,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        id: 13474,
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
    ];

    await Promise.all(fixListActivityReportObjectiveResources.map(async (fi) => queryInterface.sequelize.query(`
    UPDATE "ActivityReportObjectiveResources"
    SET "userProvidedUrl" = '${fi.new}'
    WHERE id = ${fi.id}
    AND "userProvidedUrl" = '${fi.old}';
    `, { transaction })));

    const urlRegex = '(?:(?:http(?:s)?|ftp(?:s)?|sftp):\\/\\/(?:(?:[a-zA-Z0-9._]+)(?:[:](?:[a-zA-Z0-9%._\\+~#=]+))?[@])?(?:(?:www\\.)?(?:[a-zA-Z0-9%._\\+~#=\\-]{1,}\\.[a-z]{2,6})|(?:(?:[0-9]{1,3}\\.){3}[0-9]{1,3}))(?:[:](?:[0-9]+))?(?:[\\/](?:[-a-zA-Z0-9@:%_\\+.,~#&\\/=()]*[-a-zA-Z0-9@:%_\\+.~#&\\/=()])?)?(?:[?](?:[-a-zA-Z0-9@:%_\\+.~#&\\/=()]*))*)';

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
              "or".id "objectiveResourceId"
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
              "or".id "objectiveResourceId"
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
              "or".id "objectiveResourceId"
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
    // 10. Collect all records per objective and calculate onAR and onApprovedAR.
    // 11. Update ObjectiveResources to sync createdAt, updatedAt, onAR, and onApprovedAR.
    // 12. Insert any new records into ObjectiveResources.
    // 13. Collect all records that have been affected.
    // 10. Return statistics form operation.
    await queryInterface.sequelize.query(`
    WITH
      "ActivityReportObjectiveResourcesURLs" AS (
        SELECT
          id,
          (regexp_matches("userProvidedUrl",'${urlRegex}','g')) urls,
          "userProvidedUrl",
          "activityReportObjectiveId",
          "createdAt",
          "updatedAt"
        FROM "ActivityReportObjectiveResources"
      ),
      "ActivityReportObjectiveResourcesSource" AS (
        SELECT
          ru.id,
          u.url,
          ru."userProvidedUrl",
          ru."activityReportObjectiveId",
          ru."createdAt",
          ru."updatedAt"
        FROM "ActivityReportObjectiveResources" r
        JOIN "ActivityReportObjectiveResourcesURLs" ru
        ON r.id = ru.id
        CROSS JOIN UNNEST(ru.urls) u(url)
        WHERE r."userProvidedUrl" like '%' || u.url || '%'
        AND trim(r."userProvidedUrl") != u.url
        ORDER BY r.id
      ),
      "ActivityReportObjectiveResourcesCounts" AS (
        SELECT
          id,
          count(url) cnt
        FROM "ActivityReportObjectiveResourcesSource"
        GROUP BY id
      ),
      "UpdateActivityReportObjectiveResources" AS (
        UPDATE "ActivityReportObjectiveResources" "or"
        SET
          "userProvidedUrl" = ors.url
        FROM "ActivityReportObjectiveResourcesSource" ors
        JOIN "ActivityReportObjectiveResourcesCounts" orc
        ON ors.id = orc.id
        WHERE "or".id = ors.id
        AND orc.cnt = 1
        RETURNING
          "or".id "activityReportObjectiveResourceId"
      ),
      "NewActivityReportObjectiveResources" AS (
        INSERT INTO "ActivityReportObjectiveResources" (
          "userProvidedUrl",
          "activityReportObjectiveId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          ors.url "userProvidedUrl",
          ors."activityReportObjectiveId",
          ors."createdAt",
          ors."updatedAt"
        FROM "ActivityReportObjectiveResourcesSource" ors
        JOIN "ActivityReportObjectiveResourcesCounts" orc
        ON ors.id = orc.id
        WHERE orc.cnt != 1
        RETURNING
          id "activityReportObjectiveResourceId"
      ),
      "DeleteActivityReportObjectiveResources" AS (
        DELETE FROM "ActivityReportObjectiveResources" "or"
        USING "ActivityReportObjectiveResourcesCounts" orc
        WHERE "or".id = "orc".id
        AND orc.cnt != 1
        RETURNING
          "or".id "activityReportObjectiveResourceId"
      ),
      "MalformedActivityReportObjectiveResources" AS (
        SELECT
          r.id
        FROM "ActivityReportObjectiveResources" r
        LEFT JOIN "ActivityReportObjectiveResourcesURLs" ru
        ON r.id = ru.id
        WHERE ru.id IS NULL
      ),
      "DeleteMalformedActivityReportObjectiveResources" AS (
        DELETE FROM "ActivityReportObjectiveResources" "or"
        USING "MalformedActivityReportObjectiveResources" mor
        WHERE "or".id = "mor".id
        RETURNING
          "or".id "activityReportObjectiveResourceId"
      ),
      "AffectedActivityReportObjectiveResources" AS (
        SELECT
          "activityReportObjectiveResourceId",
          'updated' "action",
          'ActivityReportObjectiveResources' "table"
        FROM "UpdateActivityReportObjectiveResources"
        UNION
        SELECT
          "activityReportObjectiveResourceId",
          'created' "action",
          'ActivityReportObjectiveResources' "table"
        FROM "NewActivityReportObjectiveResources"
        UNION
        SELECT
          "activityReportObjectiveResourceId",
          'replaced' "action",
          'ActivityReportObjectiveResources' "table"
        FROM "DeleteActivityReportObjectiveResources"
        UNION
        SELECT
          "activityReportObjectiveResourceId",
          'removed' "action",
          'ActivityReportObjectiveResources' "table"
        FROM "DeleteMalformedActivityReportObjectiveResources"
      ),
      "ActivityReportObjectiveResourcesSync" AS (
        SELECT
          aro."objectiveId",
          aror."userProvidedUrl",
          MIN(aror."createdAt") "createdAt",
          MAX(aror."updatedAt") "updatedAt",
          true "onAR",
          bool_or(COALESCE(ar."calculatedStatus"::text, '') = 'approved') "onApprovedAR"
        FROM "ActivityReportObjectiveResources" aror
        JOIN "AffectedActivityReportObjectiveResources" aaror
        ON aror.id = aaror."activityReportObjectiveResourceId"
        AND aaror."action" IN ('updated', 'created')
        JOIN "ActivityReportObjectives" aro
        ON aror."activityReportObjectiveId" = aro.id
        JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        GROUP BY
          aro."objectiveId",
          aror."userProvidedUrl"
      ),
      "UpdateObjectiveResources" AS (
        UPDATE "ObjectiveResources" "or"
        SET
          "createdAt" = LEAST("or"."createdAt",arors."createdAt"),
          "updatedAt" = GREATEST("or"."updatedAt",arors."updatedAt"),
          "onAR" = ("or"."onAR" OR arors."onAR"),
          "onApprovedAR" = ("or"."onApprovedAR" OR arors."onApprovedAR")
        FROM "ActivityReportObjectiveResourcesSync" arors
        WHERE "or"."objectiveId" = arors."objectiveId"
        AND "or"."userProvidedUrl" = arors."userProvidedUrl"
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
          arors."userProvidedUrl",
          arors."objectiveId",
          arors."createdAt",
          arors."updatedAt",
          arors."onAR",
          arors."onApprovedAR"
        FROM  "ActivityReportObjectiveResourcesSync" arors
        LEFT JOIN "ObjectiveResources" "or"
        ON "or"."objectiveId" = arors."objectiveId"
        AND "or"."userProvidedUrl" = arors."userProvidedUrl"
        WHERE "or".id IS NULL
        RETURNING
          id "objectiveResourceId"
      ),
      "AffectedObjectiveResources" AS (
        SELECT
          "objectiveResourceId",
          'updated' "action",
          'ObjectiveResources' "table"
        FROM "UpdateObjectiveResources"
        UNION
        SELECT
          "objectiveResourceId",
          'created' "action",
          'ObjectiveResources' "table"
        FROM "NewObjectiveResources"
      )
      SELECT
        "table",
        "action",
        count("activityReportObjectiveResourceId")
      FROM "AffectedActivityReportObjectiveResources"
      GROUP BY
        "table",
        "action"
      UNION
      SELECT
        "table",
        "action",
        count("objectiveResourceId")
      FROM "AffectedObjectiveResources"
      GROUP BY
        "table",
        "action";
    `, { transaction });
  }),
};
