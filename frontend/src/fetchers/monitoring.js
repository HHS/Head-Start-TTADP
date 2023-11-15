import join from 'url-join';
import { get } from '.';

const classUrl = join('/', 'api', 'monitoring');

const getClassScores = async (grantId) => {
  // const scores = await get(join(classUrl, 'class', grantId));
  // return scores.json();
  return {
    received: '05/01/2023',
    ES: 5,
    CO: 3,
    IS: 7,
  };
};

export default getClassScores;
