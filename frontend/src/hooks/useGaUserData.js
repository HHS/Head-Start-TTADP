import { useEffect } from 'react'

const USER_DATA_EVENT = 'userData'

export default function useGaUserData(user) {
  useEffect(() => {
    try {
      // we need a user to pass user data
      if (!user || !user.homeRegionId || !user.roles) {
        return
      }

      const roles = user.roles.map((role) => role.fullName)

      // check to see if we have dataLayer on the window object
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        const event = {
          event: USER_DATA_EVENT,
          region_id: user.homeRegionId,
          user_roles: roles,
        }

        window.dataLayer.push(event)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('Error sending user data to Google Analytics', err)
    }
  }, [user])
}
