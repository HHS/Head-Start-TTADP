import { createContext } from 'react';

const NetworkContext = createContext();

/** here is a little helper to see if the browser is in offline mode */
export const isOnlineMode = () => {
  try {
    if (navigator.userAgent) {
      // the first case we want to handle is IE
      // doesn't support navigator.offline so
      // we'll have to figure that out from context
      if (navigator.userAgent.indexOf('Trident') > -1) {
        return true;
      }

      return navigator.online;
    }
  } catch (error) {
    // safer just to return true here, I think
    // since any error could mean that the browser isn't supporting
    // the navigator in the way we expect
    return true;
  }

  // we need a base return here to satisfy the linter
  return true;
};

export default NetworkContext;
