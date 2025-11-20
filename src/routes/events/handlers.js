import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import { TRAINING_REPORT_STATUSES_URL_PARAMS, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import EventReport from '../../policies/event';
import { currentUserId } from '../../services/currentUser';
import {
  createEvent,
  findEventsByCollaboratorId,
  findEventBySmartsheetIdSuffix,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByRegionId,
  updateEvent,
  destroyEvent,
  findEventsByStatus,
  getTrainingReportAlertsForUser,
} from '../../services/event';
import { userById } from '../../services/users';
import { setTrainingAndActivityReportReadRegions, userIsPocRegionalCollaborator } from '../../services/accessValidation';
import filtersToScopes from '../../scopes';
import { auditLogger } from '../../logger';

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

    const { readOnly } = req.query;

    // Check if user is a collaborator.
    const userId = await currentUserId(req, res);
    const scopes = [];
    if (!readOnly && await userIsPocRegionalCollaborator(userId)) {
      scopes.push({ pocIds: { [Op.contains]: [userId] } });
    }

    if (eventId) {
      event = await findEventBySmartsheetIdSuffix(eventId, scopes);

      if (event && event.data && event.data.status === 'Complete' && !readOnly) {
        return res.status(httpCodes.FORBIDDEN).send({ message: 'Completed training events cannot be edited.' });
      }
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
      return res.sendStatus(httpCodes.FORBIDDEN);
    }

    return res.status(httpCodes.OK).send(event);
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
    const eventToUpdate = await findEventBySmartsheetIdSuffix(eventId);

    if (!eventToUpdate) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

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

    const event = await updateEvent(eventToUpdate.id, req.body);

    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await findEventBySmartsheetIdSuffix(eventId);
    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    const auth = await getEventAuthorization(req, res, event);
    if (!auth.canDelete()) { return res.sendStatus(403); }

    await destroyEvent(event.id);
    return res.status(httpCodes.OK).send({ message: 'Event deleted' });
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const getTrainingReportAlertsHandler = async (req, res) => {
  try {
    const auth = await getEventAuthorization(req, res);

    if (!auth.canSeeAlerts()) {
      return res.sendStatus(httpCodes.FORBIDDEN);
    }

    const userId = auth.user.id;

    auditLogger.info(userId, auth.readableRegions);
    const alerts = await getTrainingReportAlertsForUser(userId, auth.readableRegions);
    return res.status(httpCodes.OK).send(alerts);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
