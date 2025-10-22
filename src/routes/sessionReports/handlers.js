import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import { findEventBySmartsheetIdSuffix } from '../../services/event';
import {
  createSession,
  findSessionsByEventId,
  findSessionById,
  updateSession,
  destroySession,
  getPossibleSessionParticipants,
} from '../../services/sessionReports';
import EventReport from '../../policies/event';
import { userById } from '../../services/users';
import { getEventAuthorization } from '../events/handlers';
import { currentUserId } from '../../services/currentUser';
import { groupsByRegion } from '../../services/groups';
import SCOPES from '../../middleware/scopeConstants';

const namespace = 'SERVICE:SESSIONREPORTS';

const logContext = { namespace };

export const getHandler = async (req, res) => {
  try {
    let session;

    const {
      id,
      eventId,
    } = req.params;

    let sessionEventId = eventId;
    const params = [id, eventId];

    if (params.every((param) => typeof param === 'undefined')) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Must provide a qualifier' });
    }

    if (id) {
      session = await findSessionById(id);
      if (session.event && session.event && session.event.data && session.event.data.status === 'Complete') {
        return res.status(httpCodes.FORBIDDEN).send({ message: 'Sessions on completed training events cannot be edited.' });
      }

      sessionEventId = session.eventId;
    } else if (eventId) {
      sessionEventId = eventId;
    }

    // Event auth.
    const event = await findEventBySmartsheetIdSuffix(sessionEventId);
    if (event.data && event.data.status === 'Complete') {
      return res.status(httpCodes.FORBIDDEN).send({ message: 'Completed training events cannot be edited.' });
    }
    if (!event) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' }); }
    const eventAuth = await getEventAuthorization(req, res, event);
    if (!eventAuth.canEditSession()) {
      return res.sendStatus(403);
    }

    if (!session && eventId) {
      session = await findSessionsByEventId(event.id);
    }

    if (!session) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Session Report not found' });
    }

    if (!sessionEventId) {
      sessionEventId = session.eventId;
    }

    if (sessionEventId === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Event ID is required' });
    }

    return res.status(httpCodes.OK).send(session);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    const { eventId, data } = req.body;

    if (eventId === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Event ID is required' });
    }

    // Get associated event to use for authorization for region write
    const event = await findEventBySmartsheetIdSuffix(eventId);
    if (!event) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' }); }
    const auth = await getEventAuthorization(req, res, event);
    if (!auth.canCreateSession()) { return res.sendStatus(403); }

    const session = await createSession({
      eventId: event.id,
      data: {
        ...data,
        eventName: event.data.eventName,
        eventDisplayId: event.data.eventId,
        regionId: event.regionId,
        eventOwner: event.ownerId,
      },
    });
    return res.status(httpCodes.CREATED).send(session);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const updateHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    if (id === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Session Report ID is required' });
    }

    const { eventId } = req.body;
    if (eventId === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Event ID is required' });
    }

    // Authorization is through the associated event
    const event = await findEventBySmartsheetIdSuffix(eventId);
    if (!event) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' }); }
    const eventAuth = await getEventAuthorization(req, res, event);
    if (!eventAuth.canEditSession()) { return res.sendStatus(403); }

    const updatedSession = await updateSession(id, req.body);
    return res.status(httpCodes.CREATED).send(updatedSession);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Session Report ID is required' });
    }

    const session = await findSessionById(id);
    if (!session) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Session not found' }); }

    // Authorization is through the associated event
    // so we need to get the event first
    const event = await findEventBySmartsheetIdSuffix(session.eventId);
    const eventAuth = await getEventAuthorization(req, res, event);
    if (!eventAuth.canDeleteSession()) { return res.sendStatus(403); }

    // Delete the session
    await destroySession(id);
    return res.status(httpCodes.OK).send({ message: 'Session report deleted' });
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const getParticipants = async (req, res) => {
  try {
    const { regionId } = req.params; // checked by middleware
    const participants = await getPossibleSessionParticipants(Number(regionId));
    return res.status(httpCodes.OK).send(participants);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export async function getGroups(req, res) {
  const { region } = req.query;
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const regionNumber = parseInt(region, DECIMAL_BASE);
  const eventPolicy = new EventReport(user, { regionId: regionNumber });
  // Has correct TR permissions.
  if (
    !eventPolicy.canGetGroupsForEditingSession()
  ) {
    res.sendStatus(403);
    return;
  }
  try {
    // Get groups for shared users and region.
    const groups = await groupsByRegion(regionNumber, userId);
    res.json(groups);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
