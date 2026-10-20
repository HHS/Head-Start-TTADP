/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

export async function getCitationReviewTypes() {
  const reviewTypes = await get(join('/', 'api', 'delivered-reviews', 'citation-review-types'));
  return reviewTypes.json();
}
