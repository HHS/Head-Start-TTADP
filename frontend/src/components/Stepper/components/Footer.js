/*
  This footer should be used with inside <Pager /> or <Stepper /> forms. I feel
  like this class may be able to be refactored using 'render-props' for a better
  developer experience when creating forms.
*/
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';

function Footer({
  first, last, valid, onPreviousStep,
}) {
  return (
    <div>
      <Button type="button" outline disabled={first} onClick={onPreviousStep}>Previous</Button>
      {!last && <Button type="submit" disabled={!valid}>Next</Button>}
      {last && <Button type="submit" disabled={!valid}>Submit</Button>}
    </div>
  );
}

Footer.propTypes = {
  first: PropTypes.bool.isRequired,
  last: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired,
  onPreviousStep: PropTypes.func.isRequired,
};

export default Footer;
