/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Controller, useForm } from 'react-hook-form';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Alert, Button, TextInput } from '@trussworks/react-uswds';
import colors from '../../colors';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import Req from '../../components/Req';
import { getRecipientAndGrantsByUser } from '../../fetchers/recipient';
import MultiSelect from '../../components/MultiSelect';
import { createGroup, fetchGroup, updateGroup } from '../../fetchers/groups';

const mapGrants = (grants) => grants.map((grant) => ({
  value: grant.id,
  label: grant.name,
}));

const mapRecipients = (recipients) => recipients.map((recipient) => ({
  label: recipient.name,
  options: mapGrants(recipient.grants),
}));

export default function MyGroups({ match }) {
  const { groupId } = match.params;
  const [recipients, setRecipients] = useState([]);
  const [error, setError] = useState(null);
  const history = useHistory();
  const [recipientsFetched, setRecipientsFetched] = useState(false);

  const { control, handleSubmit, setValue } = useForm({
    defaultValues: {
      'new-group-name': '',
      'select-recipients-new-group': [],
    },
  });

  useEffect(() => {
    async function getGroup() {
      try {
        const existingGroupData = await fetchGroup(groupId);
        if (existingGroupData) {
          setValue('new-group-name', existingGroupData.name);
          setValue('select-recipients-new-group', mapGrants(existingGroupData.grants));
        }
      } catch (err) {
        setError('There was an error fetching your group');
      }
    }

    // load existing group data from API based on query param
    if (groupId) {
      getGroup();
    }
  }, [groupId, setValue]);

  useEffect(() => {
    // get grants/recipients for user
    async function fetchRecipients() {
      try {
        setRecipientsFetched(true);
        const response = await getRecipientAndGrantsByUser();
        setRecipients(mapRecipients(response));
      } catch (err) {
        setError('There was an error fetching your recipients');
      }
    }
    if (!recipientsFetched) {
      fetchRecipients();
    }
  }, [recipientsFetched]);

  const onSubmit = async (data) => {
    try {
      if (!groupId) {
        await createGroup({
          grants: data['select-recipients-new-group'].map(({ value }) => (value)),
          name: data['new-group-name'],
        });
      }

      if (groupId) {
        await updateGroup({
          id: groupId,
          name: data['new-group-name'],
          grants: data['select-recipients-new-group'].map(({ value }) => (value)),
        });
      }

      history.push('/account');
    } catch (err) {
      setError('There was an error saving your group');
    }
  };

  return (
    <>
      <Helmet>
        <title>My groups</title>
      </Helmet>
      <Link className="margin-top-0 margin-bottom-3 display-inline-block" to="/account">
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
        Back to Account Management
      </Link>
      <h1 className="margin-top-0 landing">My groups</h1>

      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h2 className="margin-bottom-2">Create group</h2>
        <IndicatesRequiredField />
        <form onSubmit={handleSubmit(onSubmit)} className="maxw-mobile-lg">
          <div className="margin-top-4">
            <label htmlFor="new-group-name" className="display-block margin-bottom-1">
              Group name
              {' '}
              <Req />
            </label>
            <Controller
              control={control}
              name="new-group-name"
              render={({ onChange: controllerOnChange, value }) => (
                <TextInput
                  id="new-group-name"
                  name="new-group-name"
                  className="margin-top-0"
                  onChange={(e) => {
                    controllerOnChange(e.target.value);
                  }}
                  required
                  value={value}
                />
              )}
            />

          </div>
          <div className="margin-top-4">
            <label className="display-block margin-bottom-1">
              Recipients
              {' '}
              <Req />
              <MultiSelect
                name="select-recipients-new-group"
                options={recipients}
                control={control}
                simple={false}
                required="Select at least one"
              />
            </label>
          </div>
          {error && (
            <Alert type="error" className="margin-top-4">
              {error}
            </Alert>
          )}
          <div className="margin-top-4">
            <Button type="submit">Save group</Button>
            <Link to="/account" className="usa-button usa-button--outline">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}

MyGroups.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
