import { stringify } from 'query-string';
import { fetchUtils, HttpError } from 'react-admin';
import join from 'url-join';

const apiUrl = join('/', 'api', 'admin');
const httpClient = fetchUtils.fetchJson;

export default {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = {
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify(params.filter),
    };
    const url = `${apiUrl}/${resource}?${stringify(query)}`;

    const { headers, json } = await httpClient(url);
    const total = headers.get('content-range')
      ? parseInt(headers.get('content-range').split('/').pop(), 10)
      : 0;

    return {
      data: json,
      total,
    };
  },

  getOne: (resource, params) =>
    httpClient(`${apiUrl}/${resource}/${params.id}`).then(({ json }) => ({
      data: json,
    })),

  deleteMany: () => {
    throw new HttpError('Bulk delete is disabled for admin diagnostics', 405);
  },
};
