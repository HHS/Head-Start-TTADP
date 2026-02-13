import Redis from 'ioredis'
import { generateRedisConfig } from './queue'
import { auditLogger } from '../logger'

let client: Redis | null = null

export function getRedis(): Redis {
  if (client) return client
  const { uri, tlsEnabled } = generateRedisConfig()
  client = new Redis(uri, {
    tls: tlsEnabled ? { rejectUnauthorized: false } : undefined,
    connectionName: 'app:base',
  })
  client.on('error', (e) => {
    auditLogger.error('[redis] connection error', e)
  })
  return client
}

export async function closeRedis() {
  if (client && client.status !== 'end') {
    try {
      await client.quit()
    } catch {
      client.disconnect()
    }
  }
}
