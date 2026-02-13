import React from 'react'
import PropTypes from 'prop-types'
import { Fieldset, Label, Radio } from '@trussworks/react-uswds'
import Req from '../Req'

export default function DivergenceRadio({ divergenceLabel, divergence, setDivergence }) {
  return (
    <Fieldset>
      <Label htmlFor="rtr-divergence-same" className="margin-top-0">
        {divergenceLabel} <Req />
      </Label>
      <Radio id="rtr-divergence-same" name="rtr-divergence" value="same" checked={!divergence} onChange={() => setDivergence(false)} label="Yes" />
      <Radio
        id="rtr-divergence-different"
        name="rtr-divergence"
        value="different"
        checked={divergence}
        onChange={() => setDivergence(true)}
        label="No"
      />
    </Fieldset>
  )
}

DivergenceRadio.propTypes = {
  divergenceLabel: PropTypes.string.isRequired,
  divergence: PropTypes.bool.isRequired,
  setDivergence: PropTypes.func.isRequired,
}
