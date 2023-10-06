import { useEffect } from 'react';

export default function useGaUserData(user) {
  useEffect(() => {
    try {
      if (!user) {
        return;
      }
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        const eventNames = window.dataLayer.map((item) => item.event);
        if (eventNames.includes('userData')) {
          return;
        }

        if (!user.id || !user.roles) {
          return;
        }

        const event = {
          event: 'userData',
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
