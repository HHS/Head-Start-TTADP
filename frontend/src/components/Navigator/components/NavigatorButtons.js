import React from 'react'
import PropTypes from 'prop-types'
import { Button } from '@trussworks/react-uswds'

export default function NavigatorButtons({ isAppLoading, onContinue, onSaveDraft, onUpdatePage, path, position }) {
  return (
    <div className="display-flex">
      <Button id={`draft-${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>
        Save and continue
      </Button>
      <Button id={`draft-${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={() => onSaveDraft()}>
        Save draft
      </Button>
      {position > 1 ? (
        <Button
          id={`draft-${path}-back`}
          outline
          type="button"
          disabled={isAppLoading}
          onClick={() => {
            onUpdatePage(position - 1)
          }}
        >
          Back
        </Button>
      ) : null}
    </div>
  )
}

NavigatorButtons.propTypes = {
  isAppLoading: PropTypes.bool.isRequired,
  onContinue: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  path: PropTypes.string.isRequired,
  position: PropTypes.number.isRequired,
}
