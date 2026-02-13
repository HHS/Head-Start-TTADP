import { useState } from 'react'
import { uniq } from 'lodash'

export default function usePerGrantMetadata(currentValue, onChange) {
  const data = uniq(Object.values(currentValue || {}))
  const [divergence, setDivergence] = useState(data.length > 1)

  const updateSingle = (grantNumber, newValue) => {
    onChange({
      ...currentValue,
      [grantNumber]: newValue,
    })
  }

  const updateAll = (newSource) => {
    const newValues = Object.keys(currentValue).reduce((acc, key) => {
      acc[key] = newSource
      return acc
    }, {})

    onChange(newValues)
  }

  return {
    data,
    divergence,
    setDivergence,
    updateSingle,
    updateAll,
  }
}
