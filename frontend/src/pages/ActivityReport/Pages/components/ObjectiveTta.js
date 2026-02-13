import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Label } from '@trussworks/react-uswds'
import { Editor } from 'react-draft-wysiwyg'
import Req from '../../../../components/Req'
import RichEditor from '../../../../components/RichEditor'
import { getEditorState } from '../../../../utils'
import Drawer from '../../../../components/Drawer'
import DrawerTriggerButton from '../../../../components/DrawerTriggerButton'
import ContentFromFeedByTag from '../../../../components/ContentFromFeedByTag'
import './ObjectiveTta.scss'

export default function ObjectiveTta({ ttaProvided, onChangeTTA, isOnApprovedReport, error, validateTta, inputName }) {
  const drawerTriggerRef = useRef(null)
  if (isOnApprovedReport) {
    const defaultEditorState = getEditorState(ttaProvided || '')
    return (
      <>
        <p className="usa-prose margin-bottom-0 text-bold">TTA provided</p>
        <Editor readOnly toolbarHidden defaultEditorState={defaultEditorState} />
      </>
    )
  }

  return (
    <FormGroup error={error.props.children}>
      <Drawer triggerRef={drawerTriggerRef} stickyHeader stickyFooter title="Get help writing TTA provided">
        <ContentFromFeedByTag className="ttahub-drawer--objective-tta-provided" tagName="ttahub-tta-provided" />
      </Drawer>
      <div className="display-flex">
        <Label htmlFor={inputName}>
          <>
            TTA provided
            <Req />
          </>
        </Label>
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>Get help writing TTA provided</DrawerTriggerButton>
      </div>
      {error}
      <div className="smart-hub--text-area__resize-vertical margin-top-1">
        <input type="hidden" name={inputName} value={ttaProvided} />
        <RichEditor
          ariaLabel="TTA provided for objective, required"
          defaultValue={ttaProvided}
          value={ttaProvided}
          onChange={onChangeTTA}
          onBlur={validateTta}
        />
      </div>
    </FormGroup>
  )
}

ObjectiveTta.propTypes = {
  ttaProvided: PropTypes.string.isRequired,
  onChangeTTA: PropTypes.func.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  error: PropTypes.node.isRequired,
  validateTta: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
}
