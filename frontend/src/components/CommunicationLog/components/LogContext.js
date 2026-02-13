import React, { useState, createContext, useContext, useEffect } from 'react'
import PropTypes from 'prop-types'
import { getAdditionalCommunicationLogData } from '../../../fetchers/communicationLog'

const LogContext = createContext()

const LogProvider = ({ children, regionId }) => {
  const [regionalUsers, setRegionalUsers] = useState([])
  const [standardGoals, setStandardGoals] = useState([])
  const [recipients, setRecipients] = useState([])
  const [groups, setGroups] = useState([])

  useEffect(() => {
    const fetchLogData = async () => {
      try {
        const data = await getAdditionalCommunicationLogData(regionId)
        setRegionalUsers(data.regionalUsers)
        setStandardGoals(data.standardGoals)
        setRecipients(data.recipients)
        setGroups(data.groups)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error fetching additional communication log data')
      }
    }

    fetchLogData()
  }, [regionId])

  return (
    <LogContext.Provider
      value={{
        regionalUsers,
        standardGoals,
        recipients,
        groups,
      }}
    >
      {children}
    </LogContext.Provider>
  )
}

LogProvider.propTypes = {
  children: PropTypes.node.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

const useLogContext = () => useContext(LogContext)

export { LogProvider, useLogContext, LogContext }
