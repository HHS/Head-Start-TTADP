/* eslint-disable no-alert */
/* eslint-disable react/no-danger */
import React, { useEffect, useState } from 'react'
import { getRedisInfo, flushRedis } from '../../fetchers/Admin'

export default function Redis() {
  const [redisInfo, setRedisInfo] = useState('')

  const flushRedisCache = async () => {
    if (window.confirm('Are you sure you want to flush the redis cache?')) {
      try {
        const { info } = await flushRedis()
        setRedisInfo(`Cache flushed successfully \n\n\n\n\n\n\n  ${info}`)
      } catch (err) {
        setRedisInfo('Error flushing cache')
      }
    }
  }

  useEffect(() => {
    async function fetchRedisInfo() {
      try {
        const { info } = await getRedisInfo()
        setRedisInfo(info)
      } catch (err) {
        setRedisInfo('Error fetching redis info')
      }
    }

    fetchRedisInfo()
  }, [])

  // convert all the \n & \r to <br> tags
  const info = redisInfo.replace(/\\n/g, '<br>').replace(/\\r/g, '<br>')

  return (
    <div>
      <button type="button" onClick={flushRedisCache}>
        Flush redis cache
      </button>
      <pre dangerouslySetInnerHTML={{ __html: info }} style={{ whiteSpace: 'pre-line' }} />
    </div>
  )
}
