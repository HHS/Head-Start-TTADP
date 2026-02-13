import { useEffect, useRef } from 'react'
import { useFormContext } from 'react-hook-form'

/**
 * This needs to be accompanied by a hidden input within the form
 * with the name `visitedField` <input type="hidden" ref={register()} name={visitedField} />
 * @param {string} visitedField
 */
export default function useCompleteSectionOnVisit(visitedField) {
  const { watch, setValue } = useFormContext()
  const visitedRef = useRef(false)
  const pageVisited = watch(visitedField)

  useEffect(() => {
    /**
     * this is some weirdness, I admit...
     * I want to replicate the behavior of the
     * page in the activity report form (not started until you visit it,
     * complete one you do), but also use the page state hooks that I
     * wrote for the session & training forms
     */

    if (!pageVisited && !visitedRef.current) {
      visitedRef.current = true
      setValue(visitedField, true)
    }
  }, [pageVisited, setValue, visitedField])
}
