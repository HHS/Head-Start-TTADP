import { useEffect } from 'react';

const USER_DATA_EVENT = 'userData';

export default function useGaUserData(user) {
  useEffect(() => {
    try {
      // we need a user to pass user data
      if (!user || !user.id || !user.roles) {
        return;
      }

      // check to see if we have dataLayer on the window object
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        // or we've already passed the userData
        const eventNames = window.dataLayer.map((item) => item.event);
        if (eventNames.includes('userData')) {
          return;
        }

        const event = {
          event: USER_DATA_EVENT,
          user_id: user.id,
          user_roles: user.roles,
        };

        window.dataLayer.push(event);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('Error sending user data to Google Analytics', err);
    }
  }, [user]);
}
