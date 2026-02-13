import React from 'react'
import PropTypes from 'prop-types'
import { Grid } from '@trussworks/react-uswds'

export default function DataRow({ label, value }) {
  return (
    <Grid row className="margin-bottom-1">
      <Grid desktop={{ col: 2 }} mobileLg={{ col: 12 }} gap={{ desktop: 2 }}>
        {label}
      </Grid>
      <Grid desktop={{ col: 10 }} mobileLg={{ col: 12 }}>
        {value}
      </Grid>
    </Grid>
  )
}

DataRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
}
