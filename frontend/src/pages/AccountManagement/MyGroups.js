/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useContext, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Controller, useForm } from 'react-hook-form';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Button, TextInput } from '@trussworks/react-uswds';
import colors from '../../colors';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import Req from '../../components/Req';
import UserContext from '../../UserContext';
import { getRecipientAndGrantsByUser } from '../../fetchers/recipient';
import MultiSelect from '../../components/MultiSelect';
import { createGroup } from '../../fetchers/groups';

export default function MyGroups() {
  const [recipients, setRecipients] = useState([]);
  const history = useHistory();
  const [recipientsFetched, setRecipientsFetched] = useState(false);
  const { user } = useContext(UserContext);

  const { control, handleSubmit } = useForm({
    defaultValues: {
      'new-group-name': '',
      'select-recipients-new-group': [],
    },
  });

  useEffect(() => {
    // load existing group data from API based on query param
  }, []);

  useEffect(() => {
    // get grants/recipients for user
    async function fetchRecipients() {
      try {
        setRecipientsFetched(true);
        const response = await getRecipientAndGrantsByUser();
        setRecipients(response.map((recipient) => ({
          label: recipient.name,
          options: recipient.grants.map((grant) => ({
            value: grant.id,
            label: grant.name,
          })),
        })));
      } catch (err) {
        //
      }
    }
    if (!recipientsFetched) {
      fetchRecipients();
    }
  }, [recipientsFetched]);

  const onSubmit = async (data) => {
    try {
      await createGroup({
        grants: data['select-recipients-new-group'].map(({ value }) => (value)),
        name: data['new-group-name'],
      });

      history.push('/account');
    } catch (err) {
      // todo - handle error
    }
  };

  return (
    <>
      <Helmet>
        <title>My groups</title>
      </Helmet>
      <Link className="margin-top-2 margin-bottom-3 display-inline-block" to="/account">
        { /** todo: the margin/spacing on this thing is a mess */}
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
        Back to Account Management
      </Link>
      <h1 className="landing">My groups</h1>

      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h2 className="margin-bottom-2">Create a group</h2>
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
          <div className="margin-top-2">
            <label htmlFor="select-recipients-new-group" className="display-block margin-bottom-1">
              Recipients
              {' '}
              <Req />
            </label>
            <MultiSelect
              name="select-recipients-new-group"
              options={recipients}
              control={control}
              simple={false}
              required="Select at least one"
            />
          </div>
          <div className="margin-top-3">
            <Button type="submit" className="margin-top-2">Save group</Button>
            <Button type="button" outline className="margin-top-2 margin-left-1">Cancel</Button>
          </div>
        </form>
      </div>

    </>
  );
}
