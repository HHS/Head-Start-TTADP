import React, { useState, useEffect, useContext } from 'react'
import { ALL_STATES_FLATTENED, ALL_STATES } from '@ttahub/common'
import PropTypes from 'prop-types'
import UserContext from '../UserContext'
import { getStateCodes } from '../fetchers/users'
import { allRegionsUserHasActivityReportPermissionTo } from '../permissions'
import MultiSelect from './MultiSelect'

export default function StateMultiSelect({ name, control }) {
  const { user } = useContext(UserContext)
  const [stateCodes, setStateCodes] = useState()

  useEffect(() => {
    async function fetchStateCodes() {
      const allowedRegions = allRegionsUserHasActivityReportPermissionTo(user)

      let codes = []

      // if we've permissions in region 11 or 12, we have to manually
      // build the list of state codes for our user
      if (allowedRegions.includes(11) || allowedRegions.includes(12)) {
        try {
          const response = await getStateCodes()
          codes = response.map((code) => {
            const found = ALL_STATES_FLATTENED.find((c) => c.value === code)
            if (found) {
              return found
            }

            return {
              value: code,
              label: code,
            }
          })
        } catch (err) {
          codes = ALL_STATES_FLATTENED
        }
      }

      // and then, just in case they have permissions to other regions,
      // we loop through and add to the list
      codes = [
        ...codes,
        ...Array.from(
          new Set(
            allowedRegions.reduce((acc, curr) => {
              if (curr === 11 || curr === 12) {
                // we've already handled these in the fetch above
                return acc
              }

              if (!ALL_STATES[curr - 1]) {
                return acc
              }
              return [...acc, ...ALL_STATES[curr - 1]]
            }, [])
          )
        ),
      ]

      codes = codes.sort((firstCode, secondCode) => {
        if (firstCode.value < secondCode.value) {
          return -1
        }
        if (firstCode.value > secondCode.value) {
          return 1
        }

        return 0
      })

      codes = Array.from(new Set(codes))

      // return list sorted alphabetically
      setStateCodes(codes)
    }

    // we're only fetching these once
    if (!stateCodes) {
      fetchStateCodes()
    }
  }, [stateCodes, user])

  return <MultiSelect name={name} control={control} simple={false} labelProperty="label" valueProperty="value" options={stateCodes || []} />
}

StateMultiSelect.propTypes = {
  name: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
}
