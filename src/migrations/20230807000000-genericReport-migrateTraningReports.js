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
      } -> EventReport(
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

      I dont have a method/plan/structure for saving the page state. This needs to be added. Perferibly to a new table.
      */

      /* TODO: How to migrate from "SessionReportPilots"
        I have a few I dont know where I want to put them:
          duration
          objectiveTrainers
          objectiveSupportType

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
        } -> SessionReport(
          eventReportId // ID of linked event,
          regionId,
          name,

        )
        {
          data.objective,
          data.ttaProvided,
        } -> ReportObjectiveTemplate(
          objectiveTitle
          ttaProvided,
        ) -> ObjectiveTemplate(
          objectiveTitle
        )
        data.files -> ReportObjectiveTemplateFiles -> ObjectiveTemplateFiles
        data.objectiveResources -> ReportObjectiveTemplateResources -> ObjectiveTemplateResources
        data.objectiveTopics -> ReportObjectiveTemplateResources -> ObjectiveTemplateResources
        data.recipients -> ReportRecipients
        data.recipientNextSteps -> reportNextSteps( type = recipient)
        data.specialistNextSteps -> reportNextSteps( type = specialist)

        same as above, I dont have a method/plan/structure for saving the page state. This needs
        to be added. Perferibly to a new table.
        {
          data.deliveryMethod,
          data.numberOfParticipants,
          data.numberOfParticipantsInPerson,
          data.numberOfParticipantsVirtually,
          data.participants,
        } -> reportParticipations( // Note this table needs to be added to the other migration file
          deliveryMethod, // should/will be calculated from the distinct values if they are available, where either is null indicate the other type, both non-null it hybrid
          numberOfParticipants, // should/will be calculated from the distinct values if they are available
          inpersonParticipants,
          virtualParticipants
        ) -> reportParticipationParticipants ( // Note this table needs to be added to the other migration file
          participentid
        ) -> Participants()
      */
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
    },
  ),
};
