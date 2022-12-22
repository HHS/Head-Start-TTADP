import { useMemo, useState, useEffect } from 'react';
import { DECIMAL_BASE } from '../Constants';

/**
 * Takes in a url param, and returns a state variable, a setter for that state variable,
 * and a param object for access in the component using this hook.
 * reads the initial state from the window
 * as a side effect, updates the param value when the state changes
 * @param {String} param the name of the url param to gather into an array
 * @returns {Array} [value, setValue, params]
 *  value: the value of the url param
 *  setValue: a function to set the value of the url param
 */
export default function useUrlParamState(param) {
  const params = useMemo(() => new URLSearchParams(document.location.search), []);
  // we are storing in an array because that way we don't have to handle commas in the string
  // in a special way
  const initial = useMemo(() => {
    try {
      return params.get(param).split(',').map((id) => parseInt(id, DECIMAL_BASE));
    } catch (e) {
      return []; // if empty, something above will error (e.g. params.get will return null
      // and be unable to call split)
    }
  }, [param, params]);

  const [values, setValues] = useState(initial || []);

  useEffect(() => {
    params.set(param, values.join(','));
  }, [values, param, params]);

  return [values, setValues, params];
}
