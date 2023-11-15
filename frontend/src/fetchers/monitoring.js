import join from 'url-join';
import { get } from '.';

const classUrl = join('/', 'api', 'monitoring');

const getClassScores = async (grantId) => {
  const scores = await get(join(classUrl, 'class', grantId));
  return scores.json();
};

export default getClassScores;
