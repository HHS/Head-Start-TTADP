import useDeepCompareEffect from 'use-deep-compare-effect'
import { IN_PROGRESS, COMPLETE, NOT_STARTED } from '../components/Navigator/constants'

export default function useHookFormPageState(hookForm, pages, currentPage) {
  const pageState = hookForm.watch('pageState')
  useDeepCompareEffect(() => {
    const whereWeAre = pages.find((p) => p.path === currentPage)
    if (!whereWeAre) {
      return
    }

    // the reducer takes the current page state and updates it based on the
    // pages provided to the navigator
    const ns = pages.reduce(
      (newState, page) => {
        // we don't include the review page in the page state, as that is
        // derived from the event status
        if (page.review) {
          return newState
        }

        // each page has a function that determines if it is complete
        // based on whether all the fields on it have been filled out
        const isComplete = page.isPageComplete(hookForm)

        // we create a new state object so that we can return a new object
        // and satisfy eslint's no-param-reassign rule
        const state = { ...newState }

        // if the page is complete, it's complete
        // hard to argue with that
        if (isComplete) {
          state[page.position] = COMPLETE
          // if the page is not complete, but we're on it, it's in progress
          // or if it's already been marked as in progress, it's in progress
        } else if (whereWeAre.position === page.position || newState[page.position] === IN_PROGRESS) {
          state[page.position] = IN_PROGRESS
          // otherwise, it's not started
        } else {
          state[page.position] = NOT_STARTED
        }

        // the new state created from the spread of the old
        return state

        // and of course, we initialize the reducer with the current page state
        // as the default value
      },
      { ...pageState }
    )

    if (JSON.stringify(ns) === JSON.stringify(pageState)) {
      return
    }

    // if the new state is different from the old state, we update the form
    hookForm.setValue('pageState', ns)
  }, [currentPage, hookForm, pageState])
}
