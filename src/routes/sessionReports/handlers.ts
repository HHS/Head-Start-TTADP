import { Request, Response } from 'express';
import stringify from 'csv-stringify/lib/sync';
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
  getSessionReports,
} from '../../services/sessionReports';
import { SessionReportTableRow, GetSessionReportsResponse } from '../../services/types/sessionReport';
import EventReport from '../../policies/event';
import { userById } from '../../services/users';
import { getEventAuthorization } from '../events/handlers';
import { currentUserId } from '../../services/currentUser';
import { groupsByRegion } from '../../services/groups';
import { getUserReadRegions } from '../../services/accessValidation';

const namespace = 'SERVICE:SESSIONREPORTS';

const logContext = { namespace };

async function sendSessionReportCSV(rows: SessionReportTableRow[], res: Response) {
  const options = {
    header: true,
    quoted: true,
    quoted_empty: true,
    columns: [
      {
        key: 'eventId',
        header: 'Event ID',
      },
      {
        key: 'eventName',
        header: 'Event Title',
      },
      {
        key: 'goalTemplates',
        header: 'Supporting Goals',
      },
      {
        key: 'sessionName',
        header: 'Session Name',
      },
      {
        key: 'startDate',
        header: 'Session Start Date',
      },
      {
        key: 'endDate',
        header: 'Session End Date',
      },
      {
        key: 'objectiveTopics',
        header: 'Topics',
      },
      {
        key: 'recipients',
        header: 'Recipients',
      },
      {
        key: 'participants',
        header: 'Recipient Participants',
      },
      {
        key: 'duration',
        header: 'Duration (hours)',
      },
    ],
  };

  // Transform goalTemplates array to comma-separated string of standard values
  const transformedRows = rows.map((row) => ({
    ...row,
    objectiveTopics: Array.isArray(row.objectiveTopics)
      ? row.objectiveTopics.join(', ')
      : '',
    goalTemplates: Array.isArray(row.goalTemplates)
      ? row.goalTemplates.map((gt) => gt.standard).join(', ')
      : '',
    recipients: Array.isArray(row.recipients)
      ? row.recipients.map((r) => r.label).join(', ')
      : '',
    participants: Array.isArray(row.participants)
      ? row.participants.join(', ')
      : '',
  }));

  const csvData = stringify(transformedRows, options);

  res.attachment('training-reports.csv');
  return res.send(`\ufeff${csvData}`);
}

export const getHandler = async (req: Request, res: Response) => {
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
      session = await findSessionById(Number(id));
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
    const eventAuth = await getEventAuthorization(req, res, event, session);
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

export const createHandler = async (req: Request, res: Response) => {
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
    if (!auth.canCreateSession()) { return res.sendStatus(httpCodes.FORBIDDEN); }

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

export const updateHandler = async (req: Request, res: Response) => {
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
    const session = await findSessionById(Number(id));
    if (!event) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' }); }
    const eventAuth = await getEventAuthorization(req, res, event, session);

    if (!eventAuth.canEditSession()) { return res.sendStatus(httpCodes.FORBIDDEN); }

    const updatedSession = await updateSession(Number(id), req.body);
    return res.status(httpCodes.CREATED).send(updatedSession);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Session Report ID is required' });
    }

    const session = await findSessionById(Number(id));
    if (!session) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Session not found' }); }

    // Authorization is through the associated event
    // so we need to get the event first
    const event = await findEventBySmartsheetIdSuffix(String(session.eventId));
    const eventAuth = await getEventAuthorization(req, res, event);
    if (!eventAuth.canDeleteSession()) { return res.sendStatus(403); }

    // Delete the session
    await destroySession(Number(id));
    return res.status(httpCodes.OK).send({ message: 'Session report deleted' });
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const getParticipants = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params; // checked by middleware
    const participants = await getPossibleSessionParticipants(Number(regionId));
    return res.status(httpCodes.OK).send(participants);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export async function getGroups(req: Request, res: Response): Promise<void> {
  const { region } = req.query as { region: string };
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

export const getSessionReportsHandler = async (req: Request, res: Response) => {
  try {
    const userId = await currentUserId(req, res);

    // Get user's readable regions for authorization
    const userReadRegions = await getUserReadRegions(userId);

    // Return FORBIDDEN if user has no readable regions
    if (!userReadRegions.length) {
      return res.sendStatus(httpCodes.FORBIDDEN);
    }

    // Extract query parameters
    const {
      sortBy,
      sortDir,
      offset,
      limit,
      format,
      ...filterParams
    } = req.query as Record<string, string | undefined>;

    // Build params object for service
    // Service layer filters will handle region filtering based on userReadRegions
    // For CSV export, don't apply limit/offset to get all rows

    let offsetValue = offset ? Number(offset) : 0;
    let limitValue: number | 'all' = limit ? Number(limit) : 10;

    const formatValue = format ? format.toLowerCase() : 'json';
    const isCSV = format === 'csv';

    if (isCSV) {
      offsetValue = 0;
      limitValue = 'all';
    }

    const serviceParams = {
      sortBy: sortBy || 'id',
      sortDir: sortDir || 'DESC',
      offset: offsetValue,
      limit: limitValue,
      format: formatValue as 'json' | 'csv',
      ...filterParams,
    };

    const result: GetSessionReportsResponse = await getSessionReports(serviceParams);

    // Handle CSV response
    if (format === 'csv') {
      return await sendSessionReportCSV(result.rows, res);
    }

    // Return JSON response
    return res.json(result);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
