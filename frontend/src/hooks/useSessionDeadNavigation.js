import { useMemo } from 'react'

export default function useSessionDeadNavigation({ isAdminUser, isApprover, isSubmitted }) {
  const isSessionNavigationDead = useMemo(() => !isAdminUser && isApprover && isSubmitted, [isAdminUser, isApprover, isSubmitted])

  return {
    isSessionNavigationDead,
  }
}
