import { useState, useEffect } from 'react'

export default function usePresenceData(setShouldAutoSave) {
  const [presenceData, setPresenceData] = useState({
    hasMultipleUsers: false,
    otherUsers: [],
    tabCount: 0,
  })

  /* istanbul ignore next: hard to test websocket functionality */
  // receives presence updates from the Mesh component
  const handlePresenceUpdate = (data) => {
    setPresenceData(data)
  }

  // If there are multiple users working on the same report, we need to suspend auto-saving
  useEffect(() => {
    if (presenceData.hasMultipleUsers || presenceData.tabCount > 1) {
      const otherUsernames = presenceData.otherUsers
        .map((presenceUser) => (presenceUser.username ? presenceUser.username : 'Unknown user'))
        .filter((username, index, self) => self.indexOf(username) === index)
      if (otherUsernames.length > 0 || presenceData.tabCount > 1) {
        setShouldAutoSave(false)
      } else {
        setShouldAutoSave(true)
      }
    } else {
      setShouldAutoSave(true)
    }
  }, [presenceData, setShouldAutoSave])

  return {
    presenceData,
    setPresenceData,

    handlePresenceUpdate,
  }
}
