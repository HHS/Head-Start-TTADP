import { useMemo } from 'react'

const usePossibleGrants = (recipient) => useMemo(() => (recipient.grants || []).filter((g) => g.status === 'Active'), [recipient.grants])

export default usePossibleGrants
