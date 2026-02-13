/* eslint-disable import/prefer-default-export */
import join from 'url-join'
import { get } from './index'

const nationalCentersUrl = join('/', 'api', 'national-center')

export const getNationalCenters = async () => {
  const response = await get(nationalCentersUrl)
  return response.json()
}
