/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const sheetsUrl = join('/', 'api', 'admin', 'ss');
const activeSheetUrl = join('/', 'api', 'admin', 'ss', 'sheet');

export const getSheets = async () => {
  console.log('getting sheets');
  const response = await get(sheetsUrl);
  console.log(response);
  if (!response.ok) {
    throw new Error('Error fetching sheets');
  }
  return response.json();
};

export const getSheetById = async (sheetId) => {
  const response = await get(join(activeSheetUrl, sheetId));
  console.log(response);

  if (!response.ok) {
    throw new Error(`Error fetching sheet with ID ${sheetId}: ${response.status}`);
  }
  return response.json();
};
