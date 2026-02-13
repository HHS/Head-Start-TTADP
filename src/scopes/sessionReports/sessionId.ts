/* eslint-disable import/prefer-default-export */
export function withSessionId(sessionIds: string[]): {
  id: number[]
} {
  return {
    id: sessionIds.map((id) => Number(id)),
  }
}
