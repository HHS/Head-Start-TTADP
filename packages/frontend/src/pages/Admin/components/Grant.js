import React, { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  Grid, Alert, Label, Button,
} from '@trussworks/react-uswds';

import Select from '../../../components/Select';
import RegionDropdown from '../../../components/RegionDropdown';
import GrantLabel from './GrantLabel';

function Grant({ grant, recipients, onAssignCDIGrant }) {
  const region = grant.regionId === 13 ? 0 : grant.regionId;
  const defaultRecipient = recipients.find((g) => g.id === grant.recipientId);
  const [selectedRegion, updateSelectedRegion] = useState(region);
  const [selectedRecipient, updateSelectedRecipient] = useState({ value: defaultRecipient.id, label: `${defaultRecipient.name} - ${defaultRecipient.id}` });
  const [error, updateError] = useState('');
  const startDate = moment(grant.startDate);
  const endDate = moment(grant.endDate);

  const startDateStr = startDate.isValid() ? startDate.format('MM/DD/YYYY') : '';
  const endDateStr = endDate.isValid() ? endDate.format('MM/DD/YYYY') : '';

  return (
    <>
      {error && (
        <Alert type="error" slim noIcon>
          {error}
        </Alert>
      )}
      <div>
        <Grid row gap>
          <Grid col={6}>
            <GrantLabel label="Number" value={`${grant.number} - ${grant.id}`} />
            <GrantLabel label="Region" value={grant.regionId} />
            <GrantLabel label="Recipient" value={grant.recipient.name} />
          </Grid>
          <Grid col={6}>
            <GrantLabel label="Status" value={grant.status} />
            <GrantLabel label="Start Date" value={startDateStr} />
            <GrantLabel label="End Date" value={endDateStr} />
          </Grid>
        </Grid>
      </div>
      <div>
        <RegionDropdown
          id="region"
          name="region"
          value={selectedRegion}
          onChange={(e) => updateSelectedRegion(parseInt(e.target.value, 10))}
        />
        <div>
          <Label htmlFor="recipient">Recipient</Label>
          <Select
            className="margin-top-1 width-mobile-lg"
            options={recipients.map((g) => ({ label: `${g.name} - ${g.id}`, value: g.id }))}
            name="recipient"
            value={selectedRecipient}
            onChange={updateSelectedRecipient}
          />
        </div>
        <div className="margin-top-3">
          <Button
            type="button"
            onClick={async () => {
              if (selectedRegion === 0) {
                updateError('A region must be selected');
              } else {
                try {
                  await onAssignCDIGrant(grant.id, selectedRegion, selectedRecipient.value);
                  updateError('');
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.log(e);
                  updateError('Unable to assign CDI grant');
                }
              }
            }}
          >
            Assign region and recipient
          </Button>
        </div>
      </div>
    </>
  );
}

Grant.propTypes = {
  grant: PropTypes.shape({
    id: PropTypes.number.isRequired,
    number: PropTypes.string.isRequired,
    regionId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    recipientId: PropTypes.number,
    recipient: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  }).isRequired,
  recipients: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  onAssignCDIGrant: PropTypes.func.isRequired,
};

export default Grant;
