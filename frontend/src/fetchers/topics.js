/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

export const getTopics = async () => {
  const topics = await get((join('/', 'api', 'topic')));
  return topics.json();
};
