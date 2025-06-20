import {
  Topic,
} from '../models';

/* eslint-disable import/prefer-default-export */
export async function getAllTopics() {
  return Topic.findAll({
    attributes: ['id', 'name'],
    raw: true,
  });
}
