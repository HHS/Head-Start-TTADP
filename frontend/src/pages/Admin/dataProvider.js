import { fetchUtils } from 'react-admin';
import { stringify } from 'query-string';
import join from 'url-join';

const apiUrl = join('/', 'api', 'admin');
const httpClient = fetchUtils.fetchJson;

function normalizeFilterValue(value) {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (
      trimmedValue.length >= 2
      && ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
        || (trimmedValue.startsWith('\'') && trimmedValue.endsWith('\'')))
    ) {
      return trimmedValue.slice(1, -1);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeFilterValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => ({
      ...accumulator,
      [key]: normalizeFilterValue(nestedValue),
    }), {});
  }

  return value;
}

export default {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = {
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify(normalizeFilterValue(params.filter)),
    };
    const url = `${apiUrl}/${resource}?${stringify(query)}`;

    const { headers, json } = await httpClient(url);
    const total = headers.get('content-range') ? parseInt(headers.get('content-range').split('/').pop(), 10) : 0;

    return ({
      data: json,
      total,
    });
  },

  getOne: (resource, params) => httpClient(`${apiUrl}/${resource}/${params.id}`).then(({ json }) => ({
    data: json,
  })),

  deleteMany: async (resource, params) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    const { json } = await httpClient(`${apiUrl}/${resource}?${stringify(query)}`, {
      method: 'DELETE',
      body: JSON.stringify(params.data),
    });
    return ({ data: json });
  },
};
