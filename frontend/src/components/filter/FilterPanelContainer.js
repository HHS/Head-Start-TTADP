import React from 'react'
import PropTypes from 'prop-types'
import { Grid } from '@trussworks/react-uswds'

export default function FilterPanelContainer({ children }) {
  return <Grid className="ttahub-dashboard--filters display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">{children}</Grid>
}

FilterPanelContainer.propTypes = {
  children: PropTypes.node.isRequired,
}
