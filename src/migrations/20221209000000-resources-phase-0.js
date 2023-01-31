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

    // clean "ObjectiveResources" "ActivityReportObjectiveResources" & "ObjectiveTemplateResources"
    // Some the the issues can be solved with known lookup and replace, this will repopulate valid urls over invalid data.
    // This will allow them to keep the data they would otherwise have lost by manually looking up the url based on the supplied page title.
    const fixListResources = [
      {
        objectiveResourceIds: [555],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: '1302 Subpart A—Eligibility, Recruitment, Selection, Enrollment, and Attendance | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        objectiveResourceIds: [2594],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: '1302 Subpart E—Family and Community Engagement Program Services | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        objectiveResourceIds: [450, 449],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: '2-	Head Start Program Performance Standards- 1302.91 Staff qualifications and competency requirements https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-91-staff-qualifications-competency-requirements',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-91-staff-qualifications-competency-requirements',
      },
      {
        objectiveResourceIds: [2729],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Coaching Corner Series | ECLKC (hhs.gov), Circle Time Magazine - Cultivate Learning (uw.edu) ',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/coaching-corner-series https://cultivatelearning.uw.edu/circle-time-magazine/',
      },
      {
        objectiveResourceIds: [2085],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Comparability of Wages | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/fiscal-management/article/comparability-wages',
      },
      {
        objectiveResourceIds: [1799, 1800],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Foundations for Excellence | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/program-planning/foundations-excellence/foundations-excellence',
      },
      {
        objectiveResourceIds: [680],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Guiding Questions for Active Supervision and Safety | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/guiding-questions-active-supervision-safety',
      },
      {
        objectiveResourceIds: [568],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Head Start Performance Standards: Head Start Program Performance Standards | ECLKC (hhs.gov)  15-Minute In-Service Suites:https://eclkc.ohs.acf.hhs.gov/professional-development/article/15-minute-service-suites',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii https://eclkc.ohs.acf.hhs.gov/professional-development/article/15-minute-service-suites',
      },
      {
        objectiveResourceIds: [451, 452],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Head Start Program Performancehttps://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-91-staff-qualifications-competency-requirements',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-91-staff-qualifications-competency-requirements',
      },
      {
        objectiveResourceIds: [2577],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Head Start Program Performance Standards 1302.44 https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-44-child-nutrition  Tips for Family Style Dining https://eclkc.ohs.acf.hhs.gov/sites/default/files/video/attachments/family-style-dining-tips.pdf',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-44-child-nutrition https://eclkc.ohs.acf.hhs.gov/sites/default/files/video/attachments/family-style-dining-tips.pdf',
      },
      {
        objectiveResourceIds: [1371, 1372],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Head Start Program Performance Standards- 1302.91 Staff qualifications and competency requirements https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-91-staff-qualifications-competency-requirements',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-91-staff-qualifications-competency-requirements',
      },
      {
        objectiveResourceIds: [252],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Head Start Work Is Heart Work: OHS Priorities | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/about-us/article/head-start-work-heart-work-ohs-priorities',
      },
      {
        objectiveResourceIds: [2598],
        activityReportObjectiveResourceIds: [2466],
        objectiveTemplateResourceId: [],
        old: 'http://1302 Subpart E—Family and Community Engagement Program Services | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-eligibility-recruitment-selection-enrollment-attendance',
      },
      {
        objectiveResourceIds: [11314, 11315, 11930],
        activityReportObjectiveResourceIds: [11956, 11957, 12699],
        objectiveTemplateResourceId: [],
        old: 'http://eclkc.ohs.hhs.gov/45CFR 1302.11(b)(2) Community Assessment: The Foundation for Program Planning',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-11-determining-community-strengths-needs-resources https://eclkc.ohs.acf.hhs.gov/program-planning/community-assessment-foundation-program-planning-head-start/community-assessment-foundation-program-planning-head-start',
      },
      {
        objectiveResourceIds: [2600],
        activityReportObjectiveResourceIds: [2468],
        objectiveTemplateResourceId: [],
        old: 'http://Journeys of Hope and Courage | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage',
      },
      {
        objectiveResourceIds: [2599],
        activityReportObjectiveResourceIds: [2467],
        objectiveTemplateResourceId: [],
        old: 'http://Parent, Family, and Community Engagement (PFCE) Framework | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework',
      },
      {
        objectiveResourceIds: [10199],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'https://childrenslearninginstitute.org/resources/ https://',
        new: 'https://childrenslearninginstitute.org/resources/',
      },
      {
        objectiveResourceIds: [1297, 1300, 1303, 2083],
        activityReportObjectiveResourceIds: [1325, 1328, 1950],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/about-us/article/importance-schedules-routines https://eclkc.ohs.acf.hhs.gov/school-readiness/https://challengingbehavior.org/pyramid-model/behavior-intervention/pbs/',
        new: 'https://eclkc.ohs.acf.hhs.gov/about-us/article/importance-schedules-routines https://eclkc.ohs.acf.hhs.gov/school-readiness/ https://challengingbehavior.org/pyramid-model/behavior-intervention/pbs/',
      },
      {
        objectiveResourceIds: [12731],
        activityReportObjectiveResourceIds: [13548],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/browse/keyword/relationship-based-practices Relationship-Based Competencies to Support Family Engagement (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/browse/keyword/relationship-based-practices https://eclkc.ohs.acf.hhs.gov/family-engagement/relationship-based-competencies-support-family-engagement/relationship-based-competencies-support-family-engagement',
      },
      {
        objectiveResourceIds: [1248],
        activityReportObjectiveResourceIds: [1270],
        objectiveTemplateResourceId: [190],
        old: 'https://eclkc.ohs.acf.hhs.gov/children-disabilities/disability-services-coordinator-orientation-guide/disability-services-coordinator-orientation-guide, Expectations for the 2022-2023 Program Year (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/children-disabilities/disability-services-coordinator-orientation-guide/disability-services-coordinator-orientation-guide https://eclkc.ohs.acf.hhs.gov/video/expectations-2022-2023-program-year',
      },
      {
        objectiveResourceIds: [12220, 12223, 12226, 12229, 12232, 12235, 12238, 12241],
        activityReportObjectiveResourceIds: [13026, 13029, 13032, 13035, 13038, 13041, 13044, 13047],
        objectiveTemplateResourceId: [190],
        old: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15- minutos',
        new: 'https://eclkc.ohs.acf.hhs.gov/es/desarrollo-profesional/articulo/conjuntos-de-materiales-de-capacitacion-de-15-minutos',
      },
      {
        objectiveResourceIds: [16147, 16148, 16149, 16150],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/Head Start Act',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-act',
      },
      {
        objectiveResourceIds: [16151, 16152, 16153, 16154],
        activityReportObjectiveResourceIds: [17183, 17184, 17185, 17186],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/Head Start Act 642 (d)(2)(A-I)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-act/sec-642-powers-functions-head-start-agencies',
      },
      {
        objectiveResourceIds: [166],
        activityReportObjectiveResourceIds: [152],
        objectiveTemplateResourceId: [49],
        old: 'https://eclkc.ohs.acf.hhs.gov/humanresources/ home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledgeskills',
        new: 'https://eclkc.ohs.acf.hhs.gov/human-resources/home-visitor-supervisors-handbook/home-based-staff-qualifications-knowledge-skills',
      },
      {
        objectiveResourceIds: [743, 744, 745, 746, 747, 748, 749],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: '•	https://eclkc.ohs.acf.hhs.gov/human-resources/learning-new-leaders/training-professional-development',
        new: 'https://eclkc.ohs.acf.hhs.gov/human-resources/learning-new-leaders/training-professional-development',
      },
      {
        objectiveResourceIds: [789],
        activityReportObjectiveResourceIds: [780],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-  healing-adults',
        data: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/understanding-trauma-healing-adults',
      },
      {
        objectiveResourceIds: [13776, 13777, 13778, 13779, 13780, 13781, 13782, 13783, 13784],
        activityReportObjectiveResourceIds: [14651, 14652, 14653, 14654, 14655, 14656, 14657, 14658, 14659],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/ncecdtl House Framework, Early Childhood Learning and Outcomes Framework, Parent and Family Engagement Framework, Education Manager’s Calendar, Head Start Program Performance Standards.',
        data: 'https://eclkc.ohs.acf.hhs.gov/ncecdtl https://eclkc.ohs.acf.hhs.gov/teaching-practices/article/framework-effective-practice https://eclkc.ohs.acf.hhs.gov/school-readiness/article/head-start-early-learning-outcomes-framework-implementation-toolkit https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework https://eclkc.ohs.acf.hhs.gov/publication/education-manager-planning-calendar',
      },
      {
        objectiveResourceIds: [15724],
        activityReportObjectiveResourceIds: [16729],
        objectiveTemplateResourceId: [839],
        old: 'https://eclkc.ohs.acf.hhs.gov/ncecdtl Program leaders guide PBCIA resources for practice-based coaching. CLASS crosswalk, 15-minute in-service suite creating a caring community, IPD Beginning Teacher Series',
        data: 'https://eclkc.ohs.acf.hhs.gov/ncecdtl https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc https://eclkc.ohs.acf.hhs.gov/professional-development/article/crosswalk-15-minute-service-suites-class https://eclkc.ohs.acf.hhs.gov/video/creating-caring-community https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      },
      {
        objectiveResourceIds: [11621],
        activityReportObjectiveResourceIds: [12404],
        objectiveTemplateResourceId: [683],
        old: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-102-achieving-program-goals	',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-102-achieving-program-goals',
      },
      {
        objectiveResourceIds: [10868],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: '		 https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-d-health-program-services',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-d-health-program-services',
      },
      {
        objectiveResourceIds: [168],
        activityReportObjectiveResourceIds: [154],
        objectiveTemplateResourceId: [51],
        old: 'https://eclkc.ohs.acf.hhs.gov/policy/headstart- act/sec-648a-staff-qualifications-development',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-act/sec-648a-staff-qualifications-development',
      },
      {
        objectiveResourceIds: [14927],
        activityReportObjectiveResourceIds: [15849],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-program-performance-standards-showcase/safety-practices 1304.1 Purpose. | ECLKC (hhs.gov) Program Management | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/policy/head-start-program-performance-standards-showcase/safety-practices https://eclkc.ohs.acf.hhs.gov/policy/45-cfr-chap-xiii/1304-1-purpose https://eclkc.ohs.acf.hhs.gov/program-management',
      },
      {
        objectiveResourceIds: [12642, 12643, 12644, 12645, 12646, 12647, 12648, 12649, 12650, 12651, 12652, 12653, 12654, 12655, 12656, 12657],
        activityReportObjectiveResourceIds: [13459, 13460, 13461, 13462, 13463, 13464, 13465, 13466, 13467, 13468, 13469, 13470, 13471, 13472, 13473, 13474],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/professional- development/article/practice- based-coaching- components-implementation-strategies',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-components-implementation-strategies',
      },
      {
        objectiveResourceIds: [12566, 12568, 12570, 12572, 12574, 12577, 12579, 12581, 12583, 12585],
        activityReportObjectiveResourceIds: [13378, 13380, 13382, 13384, 13385],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/professionaldevelopment/ article/practice-based-coaching-pbc',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc',
      },
      {
        objectiveResourceIds: [297, 299, 301, 303, 305, 307, 309, 311, 313, 315],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/program-planning/article/program-planning-cycle  Management Systems Wheel https://eclkc.ohs.acf.hhs.gov/organizational-leadership/article/management-systems-wheel',
        new: 'https://eclkc.ohs.acf.hhs.gov/program-planning/article/program-planning-cycle https://eclkc.ohs.acf.hhs.gov/organizational-leadership/article/management-systems-wheel',
      },
      {
        objectiveResourceIds: [765, 766, 767],
        activityReportObjectiveResourceIds: [754, 755, 756],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/publication/active-supervision-toolkit •	https://eclkc.ohs.acf.hhs.gov/publication/guiding-questions-active-supervision-safety •	https://eclkc.ohs.acf.hhs.gov/publication/10-actions-create-culture-safety',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/active-supervision-toolkit https://eclkc.ohs.acf.hhs.gov/publication/guiding-questions-active-supervision-safety https://eclkc.ohs.acf.hhs.gov/publication/10-actions-create-culture-safety',
      },
      {
        objectiveResourceIds: [1282],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/publication/education-manager-planning-calendar, Expectations for the 2022-2023 Program Year (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/education-manager-planning-calendar https://eclkc.ohs.acf.hhs.gov/video/expectations-2022-2023-program-year',
      },
      {
        objectiveResourceIds: [17046],
        activityReportObjectiveResourceIds: [18119],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/search/eclkc?q=A-Z%20School%20Readiness&start=0&filter=&site=*',
        new: 'https://eclkc.ohs.acf.hhs.gov/search/eclkc?q=A-Z%20School%20Readiness&start=0',
      },
      {
        objectiveResourceIds: [558],
        activityReportObjectiveResourceIds: [543, 1396],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/search/eclkc?q=ERSEA&start=10&filter=&site=*',
        new: 'https://eclkc.ohs.acf.hhs.gov/search/eclkc?q=ERSEA&start=10',
      },
      {
        objectiveResourceIds: [11104],
        activityReportObjectiveResourceIds: [11746],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/health-competencies-assessment.pdf Health Service Competencies',
        new: 'https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/health-competencies-assessment.pdf https://eclkc.ohs.acf.hhs.gov/health-services-management/article/head-start-health-services-competencies',
      },
      {
        objectiveResourceIds: [11309],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'https://eclkc.ohs.hhs.gov/management Head Start Management Wheel Systems',
        new: 'https://eclkc.ohs.acf.hhs.gov/organizational-leadership/article/management-systems-wheel',
      },
      {
        objectiveResourceIds: [9328, 9329, 9330, 9331, 9332, 9333, 9334, 9335, 15055, 15056, 15057, 15058, 15059, 15060],
        activityReportObjectiveResourceIds: [10585, 10586, 10587, 10588, 10589, 10590, 10591, 10592, 15979, 15980, 15981, 15982, 15983, 15984],
        objectiveTemplateResourceId: [],
        old: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_ files?project_id=1360260&folder=6182710',
        new: 'https://mypeers.mangoapps.com/ce/pulse/user/teams/project_teams/uploaded_files?project_id=1360260&folder=6182710',
      },
      {
        objectiveResourceIds: [2406],
        activityReportObjectiveResourceIds: [2272, 17220],
        objectiveTemplateResourceId: [],
        old: 'https://nrckids.org/files/CFOC4 pdf- FINAL.pdf',
        data: 'https://nrckids.org/files/CFOC4%20pdf-%20FINAL.pdf',
      },
      {
        objectiveResourceIds: [10295],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'https://www.healthystartepic.org/wp-content/uploads/2019/04/AStEPPOpioidUseDiscussionGuide.pdf Mothers and Babies: An Intervention to Prevent Postpartum Depression (webinar)',
        data: 'https://www.healthystartepic.org/wp-content/uploads/2019/04/AStEPPOpioidUseDiscussionGuide.pdf https://eclkc.ohs.acf.hhs.gov/video/mothers-babies-intervention-prevent-postpartum-depression',
      },
      {
        objectiveResourceIds: [2596],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Journeys of Hope and Courage | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-engagement/article/journeys-hope-courage',
      },
      {
        objectiveResourceIds: [2595],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Parent, Family, and Community Engagement (PFCE) Framework | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/parent-family-community-engagement-pfce-framework',
      },
      {
        objectiveResourceIds: [779],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Practice-Based Coaching (PBC) | ECLKC (hhs.gov)  The Practice-Based Coaching Coach Competencies (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/professional-development/article/practice-based-coaching-pbc https://eclkc.ohs.acf.hhs.gov/publication/practice-based-coaching-pbc-coach-competencies',
      },
      {
        objectiveResourceIds: [556],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Search | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/search/eclkc?q=',
      },
      {
        objectiveResourceIds: [2087],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [573],
        old: 'Start with why -- how great leaders inspire action | Simon Sinek | TEDxPugetSound - YouTube',
        new: 'https://youtu.be/u4ZoJKF_VuA',
      },
      {
        objectiveResourceIds: [934],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Taking Care of Ourselves: Stress and Relaxation | ECLKC (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/family-support-well-being/article/taking-care-ourselves-stress-relaxation',
      },
      {
        objectiveResourceIds: [782],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'The Practice-Based Coaching Coach Competencies (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/practice-based-coaching-pbc-coach-competencies',
      },
      {
        objectiveResourceIds: [1365],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'Transportation Services Checklist (hhs.gov)',
        new: 'https://eclkc.ohs.acf.hhs.gov/publication/transportation-services-checklist',
      },
      {
        objectiveResourceIds: [9265],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'www.federalregister.gov/documents/2019/11/26/2019-25634/head-start-program',
        new: 'https://www.federalregister.gov/documents/2019/11/26/2019-25634/head-start-program',
      },
      {
        objectiveResourceIds: [774, 775, 776],
        activityReportObjectiveResourceIds: [],
        objectiveTemplateResourceId: [],
        old: 'www.teachstone.com',
        new: 'http://www.teachstone.com',
      },
    ];

    await Promise.all(fixListResources
      .map(async (fi) => Promise.all([
        fi.objectiveResourceIds.length > 0
          ? queryInterface.sequelize.query(`
            UPDATE "ObjectiveResources"
            SET "userProvidedUrl" = '${fi.new}'
            WHERE id in (${fi.objectiveResourceIds.join(', ')})
            AND "userProvidedUrl" = '${fi.old}';
            `, { transaction })
          : Promise.resolve,
        fi.activityReportObjectiveResourceIds.length > 0
          ? queryInterface.sequelize.query(`
            UPDATE "ActivityReportObjectiveResources"
            SET "userProvidedUrl" = '${fi.new}'
            WHERE id in (${fi.activityReportObjectiveResourceIds.join(', ')})
            AND "userProvidedUrl" = '${fi.old}';
            `, { transaction })
          : Promise.resolve,
        fi.objectiveTemplateResourceId.length > 0
          ? queryInterface.sequelize.query(`
            UPDATE "ObjectiveTemplateResources"
            SET "userProvidedUrl" = '${fi.new}'
            WHERE id in (${fi.objectiveTemplateResourceId.join(', ')})
            AND "userProvidedUrl" = '${fi.old}';
            `, { transaction })
          : Promise.resolve,
      ])));

    const urlRegex = '(?:(?:http(?:s)?|ftp(?:s)?|sftp):\\/\\/(?:(?:[a-zA-Z0-9._]+)(?:[:](?:[a-zA-Z0-9%._\\+~#=]+))?[@])?(?:(?:www\\.)?(?:[a-zA-Z0-9%._\\+~#=\\-]{1,}\\.[a-z]{2,6})|(?:(?:[0-9]{1,3}\\.){3}[0-9]{1,3}))(?:[:](?:[0-9]+))?(?:[\\/](?:[-a-zA-Z0-9\'@:%_\\+.,~#&\\/=()]*[-a-zA-Z0-9@:%_\\+.~#&\\/=()])?)?(?:[?](?:[-a-zA-Z0-9@:%_\\+.~#&\\/=()]*))*)';

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
