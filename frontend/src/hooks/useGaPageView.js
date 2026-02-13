import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// It's possible we may want to use a custom event
// but going with page_view for now
export const CONTENT_GROUP_EVENT = 'page_view'

export default function useGaPageView() {
  const location = useLocation()

  useEffect(() => {
    try {
      // check to see if we have dataLayer on the window object
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        const event = {
          event: CONTENT_GROUP_EVENT,
          content_group: location.pathname,
        }

        window.dataLayer.push(event)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('Error sending page view to Google Analytics', err)
    }
  }, [location.pathname])
}
