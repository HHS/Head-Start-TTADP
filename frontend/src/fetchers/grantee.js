import join from 'url-join';
// import {
//   get,
// } from './index';
import { DECIMAL_BASE } from '../Constants';

const granteeUrl = join('/', 'api', 'grantee');

// eslint-disable-next-line import/prefer-default-export
export const searchGrantees = async (query, regionId = '', params = { sortBy: 'name', direction: 'asc', offset: 0 }) => {
  if (!query) {
    throw new Error('Please provide a query string to search grantees');
  }

  const querySearch = `?s=${query}`;
  const regionSearch = regionId ? `&region=${regionId.toString(DECIMAL_BASE)}` : '';

  console.log(join(granteeUrl, 'search', querySearch, regionSearch, `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`));

  // const grantees = await get(
  //   join(granteeUrl, 'search', querySearch, regionSearch,
  // `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`),
  // );
  // return grantees.json();

  return {
    rows: [
      {
        id: 2,
        name: 'major tom',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 3,
        name: 'major bob',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 4,
        name: 'major sara',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 5,
        name: 'major tara',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 6,
        name: 'major jim',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 7,
        name: 'major xi',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 1,
        name: 'major larry',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 8,
        name: 'major maggie',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 10,
        name: 'major brian',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 11,
        name: 'major chumley',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 12,
        name: 'major karen',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 13,
        name: 'major superhero',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
      {
        id: 14,
        name: 'major barack',
        grants: [
          {
            programSpecialistName: 'someone else',
          },
        ],
      },
    ],
    count: 13,
  };
};
