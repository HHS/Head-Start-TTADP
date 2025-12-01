import join from 'url-join';
import {
  get, post, put, destroy,
} from './index';
import { uploadFile } from './File';

const sessionsUrl = join('/', 'api', 'session-reports');

export const createSession = async (eventId, data = {}) => {
  const response = await post(sessionsUrl, { eventId, data: { status: 'In progress', ...data } });
  return response.json();
};

export const getSessionBySessionId = async (sessionId) => {
  const response = await get(join(sessionsUrl, 'id', sessionId));
  return response.json();
};

export const getSessionsByEventId = async (eventId) => {
  const response = await get(join(sessionsUrl, 'eventId', eventId));
  return response.json();
};

export const updateSession = async (sessionId, data) => {
  const response = await put(join(sessionsUrl, 'id', sessionId), data);
  return response.json();
};

export const deleteSession = async (sessionId) => {
  const response = await destroy(join(sessionsUrl, 'id', sessionId));
  return response.json();
};

export const uploadSessionObjectiveFiles = async (sessionId, files) => {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  files.forEach((file) => formData.append('file', file));
  return uploadFile(formData);
};

export const deleteSessionObjectiveFile = async (sessionId, fileId) => {
  const fileUrl = join('/', 'api', 'files');
  const response = await destroy(
    join(fileUrl, 's', sessionId, fileId),
  );
  return response.status;
};

export const getPossibleSessionParticipants = async (regionId, stateCodes) => {
  const url = join(sessionsUrl, 'participants', String(regionId));
  const params = new URLSearchParams();
  stateCodes.forEach((code) => params.append('states', code));
  const response = await get(`${url}?${params.toString()}`);
  return response.json();
};

export const getGroupsForSession = async (regionId) => {
  const response = await get(join(sessionsUrl, 'groups', `?region=${regionId}`));
  return response.json();
};
