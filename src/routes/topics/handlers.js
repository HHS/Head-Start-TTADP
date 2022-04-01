/* eslint-disable import/prefer-default-export */
import {
  getAllTopics,
} from '../../services/topics';

export async function allTopics(req, res) {
  const topics = await getAllTopics();
  res.json(topics);
}
