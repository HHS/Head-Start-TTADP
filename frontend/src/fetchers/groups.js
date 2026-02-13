import join from 'url-join'
import { get, put, post, destroy } from './index'

const groupsUrl = join('/', 'api', 'groups')

export const fetchGroups = async () => {
  const response = await get(groupsUrl)
  return response.json()
}

export const fetchGroup = async (groupId) => {
  const getGroup = join(groupsUrl, String(groupId))
  const response = await get(getGroup)
  return response.json()
}

export const createGroup = async (group) => {
  const response = await post(groupsUrl, group)
  return response.json()
}

export const updateGroup = async (group) => {
  const response = await put(join(groupsUrl, String(group.id)), group)
  return response.json()
}

export const deleteGroup = async (groupId) => {
  const response = await destroy(join(groupsUrl, String(groupId)))
  return response.json()
}

export const getGroupUsers = async (groupId) => {
  const userGroupUrl = join(groupsUrl, String(groupId), 'eligibleUsers')
  const users = await get(userGroupUrl)
  return users.json()
}

export const getGroupGrants = async (groupId) => {
  const userGroupUrl = join(groupsUrl, String(groupId), 'grants')
  const grants = await get(userGroupUrl)
  return grants.json()
}
