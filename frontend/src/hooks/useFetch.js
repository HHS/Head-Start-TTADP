import { useContext, useState } from 'react'
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect'
import AppLoadingContext from '../AppLoadingContext'

export default function useFetch(initialValue, fetcher, dependencies = [], errorMessage = 'An unexpected error occurred') {
  const [data, setData] = useState(initialValue)
  const [error, setError] = useState('')
  const [statusCode, setStatusCode] = useState(null)
  const { setIsAppLoading } = useContext(AppLoadingContext)

  useDeepCompareEffectNoCheck(() => {
    async function fetchData() {
      try {
        setIsAppLoading(true)
        setError('')
        const response = await fetcher()
        setData(response)
        setStatusCode(200)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        setError(errorMessage)
        setStatusCode(err.status || 500)
      } finally {
        setIsAppLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  return {
    data,
    setData,
    error,
    statusCode,
  }
}
