/* eslint-disable import/prefer-default-export */
import join from 'url-join'
import { get } from './index'

const sheetsUrl = join('/', 'api', 'admin', 'ss')
const activeSheetUrl = join('/', 'api', 'admin', 'ss', 'sheet')

export const getSheets = async () => {
  const response = await get(sheetsUrl)

  if (!response.ok) {
    throw new Error('Error fetching sheets')
  }
  return response.json()
}

export const getSheetById = async (sheetId) => {
  const response = await get(join(activeSheetUrl, sheetId))

  if (!response.ok) {
    throw new Error(`Error fetching sheet with ID ${sheetId}: ${response.status}`)
  }
  return response.json()
}
