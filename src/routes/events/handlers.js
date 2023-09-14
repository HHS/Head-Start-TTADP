import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import { TRAINING_REPORT_STATUSES_URL_PARAMS, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import EventReport from '../../policies/event';
import { currentUserId } from '../../services/currentUser';
import {
  createEvent,
  findEventsByCollaboratorId,
  findEventById,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByRegionId,
  updateEvent,
  destroyEvent,
  findEventsByStatus,
  findEventCreators,
} from '../../services/event';
import { userById } from '../../services/users';
import { setTrainingAndActivityReportReadRegions, userIsPocRegionalCollaborator } from '../../services/accessValidation';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:EVENTS';

const logContext = { namespace };

export const getEventAuthorization = async (req, res, report) => {
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  return new EventReport(user, report);
};

export const getByStatus = async (req, res) => {
  try {
    const { status: statusParam } = req.params;
    const auth = await getEventAuthorization(req, res, {});
    const userId = await currentUserId(req, res);
    const status = TRAINING_REPORT_STATUSES_URL_PARAMS[statusParam];
    const updatedFilters = await setTrainingAndActivityReportReadRegions(req.query, userId);
    const { trainingReport: scopes } = await filtersToScopes(updatedFilters, { userId });

    const events = await findEventsByStatus(
      status,
      auth.readableRegions,
      userId,
      null,
      false,
      scopes,
      auth.isAdmin(),
    );

    return res.status(httpCodes.OK).send(events);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const getHandler = async (req, res) => {
  try {
    let event;
    const {
      eventId,
      regionId,
      ownerId,
      pocIds,
      collaboratorId,
    } = req.params;

    const params = [eventId, regionId, ownerId, pocIds, collaboratorId];

    if (params.every((param) => typeof param === 'undefined')) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Must provide a qualifier' });
    }

    // Check if user is a collaborator.
    const userId = await currentUserId(req, res);
    const scopes = [];
    if (await userIsPocRegionalCollaborator(userId)) {
      scopes.push({ pocIds: { [Op.contains]: [userId] } });
    }

    if (eventId) {
      event = await findEventById(eventId, scopes);
    } else if (regionId) {
      event = await findEventsByRegionId(regionId);
    } else if (ownerId) {
      event = await findEventsByOwnerId(ownerId);
    } else if (pocIds) {
      event = await findEventsByPocId(pocIds);
    } else if (collaboratorId) {
      event = await findEventsByCollaboratorId(collaboratorId);
    }

    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    const auth = await getEventAuthorization(req, res, event);

    if (!auth.canRead() && !auth.isPoc()) {
      return res.sendStatus(403);
    }

    return res.status(httpCodes.OK).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const findEventCreatorsHandler = async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('\n\n\n=======EventId: ', eventId);
    const auth = await getEventAuthorization(req, res, {});
    if (!auth.isAdmin()) {
      return res.status(403).send({ message: 'User is not authorized get event creators' });
    }

    // return a 400 if the eventId is not provided.
    if (!eventId) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Must provide a eventId' });
    }

    // Get the event.
    const event = await findEventById(eventId);
    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    // Get the regionId and ownerId from the event.
    const { regionId, ownerId } = event;
    const creators = await findEventCreators(regionId);

    // Check if creators contains the current ownerId.
    const currentOwner = creators.find((creator) => creator.id === ownerId);
    if (!currentOwner) {
      // If the current ownerId is not in the creators array, add it.
      const owner = await userById(ownerId);
      creators.push({ id: owner.id, name: owner.name });
    }

    return res.status(httpCodes.OK).send(creators);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    const { regionId } = req.body;
    const auth = await getEventAuthorization(req, res, { regionId });
    if (!auth.canWriteInRegion()) { return res.sendStatus(403); }

    const event = await createEvent(req.body);
    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const updateHandler = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    // Get event to update.
    const eventToUpdate = await findEventById(eventId);
    const auth = await getEventAuthorization(req, res, eventToUpdate);
    if (!auth.canEditEvent()) { return res.status(403).send({ message: 'User is not authorized to update event' }); }

    // check to see if req.body.data contains status and if
    // the status is TRAINING_REPORT_STATUSES.COMPLETED or
    // TRAINING_REPORT_STATUSES.SUSPENDED,
    // we need to confirm the owner of the event is the user

    if (req.body.data && req.body.data.status) {
      const { status } = req.body.data;
      if (status === TRAINING_REPORT_STATUSES.COMPLETE
        || status === TRAINING_REPORT_STATUSES.SUSPENDED
      ) {
        if (!auth.canSuspendOrCompleteEvent()) {
          return res.status(403).send({ message: 'User is not authorized to complete or suspend event' });
        }
      }
    }

    const event = await updateEvent(eventId, req.body);

    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await findEventById(eventId);
    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    const auth = await getEventAuthorization(req, res, event);
    if (!auth.canDelete()) { return res.sendStatus(403); }

    await destroyEvent(eventId);
    return res.status(httpCodes.OK).send({ message: 'Event deleted' });
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
