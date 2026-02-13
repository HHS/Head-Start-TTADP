import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// all credit for this goes to https://www.matthewhoelter.com/2022/04/02/how-to-scroll-to-top-on-route-change-with-react-router-dom-v6.html

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  }, [pathname])

  return null
}
