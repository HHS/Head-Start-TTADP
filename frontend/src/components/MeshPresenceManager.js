/* istanbul ignore file: too hard to test websockets */
import { useState, useEffect, useContext } from 'react'
import PropTypes from 'prop-types'
import { groupBy } from 'lodash'
// eslint-disable-next-line import/no-unresolved
import { MeshClient } from '@mesh-kit/core/client'
import UserContext from '../UserContext'

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || ''

function MeshPresenceManager({ room, onPresenceUpdate, onRevisionUpdate }) {
  const [client, setClient] = useState(null)
  const userContext = useContext(UserContext)

  const transformPresence = (data) => {
    const grouped = groupBy(Object.values(data.states), 'userId')

    return Object.entries(grouped).map(([userId, entries]) => ({
      userId: Number(userId),
      username: entries[0].username,
      tabs: entries.length,
    }))
  }

  // initialize client and connect on mount
  useEffect(() => {
    async function cleanup() {
      if (client) {
        await client.close()
      }
    }

    async function connect() {
      const meshClient = new MeshClient(WS_URL)
      await meshClient.connect()

      if (onRevisionUpdate && room.startsWith('ar-')) {
        meshClient.on('revision-updated', (data) => {
          // only care about revision changes for this report
          const reportId = room.replace('ar-', '')
          if (data && data.reportId && data.reportId.toString() === reportId) {
            onRevisionUpdate(data.revision, {
              userId: data.userId,
              timestamp: data.timestamp,
              reportId: data.reportId,
            })
          }
        })
      }

      // join this ar's room
      await meshClient.joinRoom(room)

      // let other clients know who I am...
      // this is how we track which ws connection is which system user
      await meshClient.publishPresenceState(room, {
        state: {
          userId: userContext.user.id,
          username: userContext.user.name,
        },
      })

      // this function takes the result of a presence state request
      // and formats it into a structure that makes sense for this feature
      const handlePresenceStateChange = (data) => {
        const users = transformPresence(data)

        onPresenceUpdate({
          presentUsers: users,
          uniqueUserCount: users.length,
          hasMultipleUsers: users.length > 1,
          otherUsers: users.filter((u) => u.userId !== userContext.user.id),
          tabCount: users.filter((u) => u.userId === userContext.user.id)[0]?.tabs,
        })
      }

      await meshClient.subscribePresence(room, async () => {
        // when there's an update (a join, leave, or state change event), ask the server
        // for all current states instead of trying to juggle this stuff client-side
        const res = await meshClient.command('mesh/get-presence-state', { roomName: room })
        handlePresenceStateChange(res)
      })

      // we only need to do this so that we can access the client
      // if/when this component cleanly unloads, in which case we
      // disconnect, which removes subscriptions, handlers, etc
      setClient(meshClient)

      // not strictly necessary because the mesh server will detect this
      // websocket disconnection and handle cleanup, but its good to be thorough
      window.addEventListener('beforeunload', cleanup)
    }

    connect()

    return () => {
      if (client) {
        // remove the beforeunload listener
        window.removeEventListener('beforeunload', cleanup)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room])

  useEffect(
    () => () => {
      if (client) {
        client.close()
      }
    },
    [client]
  )

  if (!client) {
    return null
  }

  return null
}

MeshPresenceManager.propTypes = {
  room: PropTypes.string.isRequired,
  onPresenceUpdate: PropTypes.func,
  onRevisionUpdate: PropTypes.func,
}

MeshPresenceManager.defaultProps = {
  onPresenceUpdate: null,
  onRevisionUpdate: null,
}

export default MeshPresenceManager
