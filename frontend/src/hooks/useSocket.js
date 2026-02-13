/* eslint-disable no-console */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import useInterval from '@use-it/interval'

const THIRTY_SECONDS = 30000

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || ''

export function publishLocation(socket, socketPath, user, lastSaveTime) {
  // we have to check to see if the socket is open before we send a message
  // since the interval could be called while the socket is open but is about to close
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(
      JSON.stringify({
        user: user.name,
        lastSaveTime,
        channel: socketPath,
      })
    )
  }
}

export function usePublishWebsocketLocationOnInterval(socket, socketPath, user, lastSaveTime, interval = THIRTY_SECONDS) {
  useInterval(() => publishLocation(socket, socketPath, user, lastSaveTime), interval)
}

export default function useSocket(user) {
  const [socketPath, setSocketPath] = useState()
  const [messageStore, setMessageStore] = useState()
  const socket = useRef({
    send: () => {},
    close: () => {},
    url: '',
    readyState: 0,
  })

  const path = useMemo(() => `${WS_URL}${socketPath}`, [socketPath])

  const setSocketPathWithCheck = useCallback(
    (newPath) => {
      if (socketPath === newPath) {
        return
      }
      setSocketPath(newPath)
    },
    [socketPath]
  )

  const clearStore = useCallback(() => {
    setMessageStore()
  }, [])

  useEffect(() => {
    try {
      if (!WS_URL || !socketPath) {
        return () => {}
      }

      // if we've already created a socket for the current path, return
      if (socket.current && path === socket.current.url) {
        return () => {}
      }

      if (socket.current && socket.current.readyState === socket.current.OPEN) {
        socket.current.close()
        clearStore()
      }

      const s = new WebSocket(path)

      // we don't want to send bufferdata, but json
      s.binaryType = 'arraybuffer'

      // opening a new socket will clear the store
      s.addEventListener('open', () => {
        clearStore()

        if (user) {
          socket.current.send(
            JSON.stringify({
              user: user.name || 'Anonymous user',
              lastSaveTime: null,
              channel: socketPath,
            })
          )
        }
      })

      // Listen for messages
      s.addEventListener('message', (event) => {
        if (s.readyState === s.OPEN) {
          const data = JSON.parse(event.data)
          setMessageStore(data)
        }
      })

      socket.current = s
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }

    return () => {
      // close the open socket
      if (socket.current && socket.current.readyState === socket.current.OPEN) {
        socket.current.close()
      }
    }
  }, [clearStore, path, socketPath, user])

  return {
    socketPath: setSocketPathWithCheck,
    socket: socket.current,
    messageStore,
    setSocketPath,
    clearStore,
  }
}
