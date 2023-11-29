/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState, useContext } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Controller, useForm } from 'react-hook-form';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  Alert, Button, Checkbox, FormGroup, TextInput, Radio,
} from '@trussworks/react-uswds';
import colors from '../../colors';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import Req from '../../components/Req';
import { getRecipientAndGrantsByUser, getGroupUsers } from '../../fetchers/recipient';
import MultiSelect from '../../components/MultiSelect';
import { createGroup, fetchGroup, updateGroup } from '../../fetchers/groups';
import { MyGroupsContext } from '../../components/MyGroupsProvider';
import AppLoadingContext from '../../AppLoadingContext';
import QuestionTooltip from '../../components/GoalForm/QuestionTooltip';

const mapGrants = (grants) => grants.map((grant) => ({
  value: grant.id,
  label: grant.name,
  region: grant.regionId,
}));

const mapRecipients = (recipients) => recipients.map((recipient) => ({
  label: recipient.name,
  options: mapGrants(recipient.grants),
}));

export const GROUP_FIELD_NAMES = {
  NAME: 'new-group-name',
  RECIPIENTS: 'select-recipients-new-group',
  IS_PRIVATE: 'is-private',
  CO_OWNERS: 'co-owners',
  INDIVIDUALS: 'individuals',
  SHARE_WITH_EVERYONE: 'share-with-everyone',
};

export default function MyGroups({ match }) {
  const {
    control,
    handleSubmit,
    setValue,
    setError: setFormError,
    errors: formErrors,
    watch,
  } = useForm({
    defaultValues: {
      [GROUP_FIELD_NAMES.NAME]: '',
      [GROUP_FIELD_NAMES.RECIPIENTS]: [],
      [GROUP_FIELD_NAMES.IS_PRIVATE]: true,
      [GROUP_FIELD_NAMES.CO_OWNERS]: [],
      [GROUP_FIELD_NAMES.INDIVIDUALS]: [],
      [GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE]: 'everyone',
    },
  });

  const watchIsPrivate = watch(GROUP_FIELD_NAMES.IS_PRIVATE);
  const watchShareWithEveryone = watch(GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE);
  const watchRecipients = watch(GROUP_FIELD_NAMES.RECIPIENTS);

  const { groupId } = match.params;
  const [recipients, setRecipients] = useState([]);
  const [coOwners, setCoOwners] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [shareWithEveryone, setShareWithEveryone] = useState(true);
  const [error, setError] = useState(null);
  const history = useHistory();
  const [recipientsFetched, setRecipientsFetched] = useState(false);
  const [isPrivate, setIsPrivate] = useState(watchIsPrivate);
  const [usersFetched, setUsersFetched] = useState(false);

  // see the comment above "onSubmit" for, well, context
  const { myGroups, setMyGroups } = useContext(MyGroupsContext);
  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    setIsPrivate(watchIsPrivate);
  }, [watchIsPrivate]);

  useEffect(() => {
    setShareWithEveryone(watchShareWithEveryone);
  }, [watchShareWithEveryone]);

  useEffect(() => {
    async function getGroup() {
      setIsAppLoading(true);
      try {
        const existingGroupData = await fetchGroup(groupId);
        if (existingGroupData) {
          setValue(GROUP_FIELD_NAMES.NAME, existingGroupData.name);
          setValue(GROUP_FIELD_NAMES.RECIPIENTS, mapGrants(existingGroupData.grants));
          setValue(GROUP_FIELD_NAMES.IS_PRIVATE, !existingGroupData.isPublic);
          setValue(GROUP_FIELD_NAMES.CO_OWNERS, []);
          setValue(GROUP_FIELD_NAMES.INDIVIDUALS, []);
          setValue(GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE, 'everyone');
        }
      } catch (err) {
        setError('There was an error fetching your group');
      } finally {
        setIsAppLoading(false);
      }
    }

    // load existing group data from API based on query param
    if (groupId) {
      getGroup();
    }
  }, [groupId, setIsAppLoading, setValue]);

  useEffect(() => {
    // get grants/recipients for user
    async function fetchRecipients() {
      setIsAppLoading(true);
      try {
        setRecipientsFetched(true);
        const response = await getRecipientAndGrantsByUser();
        console.log('Recipients: ', response);
        setRecipients(mapRecipients(response));
      } catch (err) {
        setError('There was an error fetching your recipients');
      } finally {
        setIsAppLoading(false);
      }
    }
    if (!recipientsFetched) {
      fetchRecipients();
    }
  }, [recipientsFetched, setIsAppLoading]);

  useDeepCompareEffect(() => {
    console.log('watchRecipients: ', watchRecipients);
    // get co-owners and individuals.
    async function fetchUsers() {
      setIsAppLoading(true);
      try {
        setUsersFetched(true);
        const { coOwnerUsers, individualUsers } = await getGroupUsers();
        setCoOwners(coOwnerUsers.map((user) => ({ value: user.id, label: user.name })));
        setIndividuals(individualUsers.map((user) => ({ value: user.id, label: user.name })));
      } catch (err) {
        setError('There was an error fetching co-owners and individuals');
      } finally {
        setIsAppLoading(false);
      }
    }
    if (!usersFetched) {
      fetchUsers();
    }
  }, [usersFetched, setIsAppLoading, watchRecipients]);

  // you'll notice that "setMyGroups" is called below
  // - since we fetch that data once, way earlier, in App.js, we must update it here
  // if a user creates or updates a group. Given that we are working in SPA, it's
  // very possible that a user will create a group, then navigate to the a page and expect to use
  // it without refreshing, so that data will not be refreshed from the API
  const onSubmit = async (data) => {
    const post = {
      grants: data[GROUP_FIELD_NAMES.RECIPIENTS].map(({ value }) => (value)),
      name: data[GROUP_FIELD_NAMES.NAME],
      isPublic: !data[GROUP_FIELD_NAMES.IS_PRIVATE],
    };

    setIsAppLoading(true);

    try {
      if (!groupId) {
        const g = await createGroup(post);
        if (g.error) {
          setFormError(g.error, { message: g.message, shouldFocus: true });
          return;
        }

        setMyGroups([...myGroups, g]);
      }

      if (groupId) {
        const g = await updateGroup({
          id: groupId,
          ...post,
        });

        if (g.error) {
          setFormError(g.error, { message: g.message, shouldFocus: true });
          return;
        }

        setMyGroups(myGroups.map((group) => {
          if (group.id === g.id) {
            return g;
          }
          return group;
        }));
      }

      history.push('/account');
    } catch (err) {
      setError('There was an error saving your group');
    } finally {
      setIsAppLoading(false);
    }
  };

  const nameError = formErrors[GROUP_FIELD_NAMES.NAME];
  const individualsError = formErrors[GROUP_FIELD_NAMES.INDIVIDUALS];
  const coOwnerError = formErrors[GROUP_FIELD_NAMES.CO_OWNERS];

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
          <FormGroup error={nameError}>
            <div className="margin-top-4">
              <label htmlFor={GROUP_FIELD_NAMES.NAME} className="display-block margin-bottom-1">
                Group name
                {' '}
                <Req />
              </label>
              <span className="usa-hint margin-bottom-1">
                Use a unique and descriptive name.
              </span>
              {nameError && <span className="usa-error-message">{nameError.message}</span>}
              <Controller
                control={control}
                name={GROUP_FIELD_NAMES.NAME}
                render={({ onChange: controllerOnChange, value }) => (
                  <TextInput
                    id={GROUP_FIELD_NAMES.NAME}
                    name={GROUP_FIELD_NAMES.NAME}
                    className="margin-top-1"
                    onChange={(e) => {
                      controllerOnChange(e.target.value);
                    }}
                    required
                    value={value}
                    disabled={isAppLoading}
                  />
                )}
              />

            </div>
          </FormGroup>
          <div className="margin-top-4">
            <label className="display-block margin-bottom-1">
              Recipients
              {' '}
              <Req />
              <MultiSelect
                name={GROUP_FIELD_NAMES.RECIPIENTS}
                options={recipients}
                control={control}
                simple={false}
                required="Select at least one"
                disabled={isAppLoading}
              />
            </label>
          </div>
          <div className="margin-top-4">
            <h2 className="margin-bottom-2">Group permissions</h2>
            <div className="margin-top-3 display-flex flex-align-end flex-align-center">
              <Controller
                control={control}
                name={GROUP_FIELD_NAMES.IS_PRIVATE}
                render={({ onChange: controllerOnChange, value }) => (
                  <>
                    <Checkbox
                      id={GROUP_FIELD_NAMES.IS_PRIVATE}
                      name={GROUP_FIELD_NAMES.IS_PRIVATE}
                      className="margin-0"
                      onChange={(e) => controllerOnChange(e.target.checked)}
                      label="Keep this group private."
                      checked={value}
                      disabled={isAppLoading}
                    />
                    <QuestionTooltip text="Keep this group private or uncheck to make public for your region" />
                  </>
                )}
              />
            </div>
            {!isPrivate && (
              <div className="margin-top-4">
                <label htmlFor={GROUP_FIELD_NAMES.NAME} className="display-block margin-bottom-1">
                  Add co-owner
                  {' '}
                  <Req />
                </label>
                {nameError && <span className="usa-error-message">{coOwnerError.message}</span>}
                <span className="usa-hint">
                  Choose up to 3 co-owners who can change permissions and edit the group.
                </span>
                <MultiSelect
                  name={GROUP_FIELD_NAMES.CO_OWNERS}
                  options={coOwners}
                  control={control}
                  simple={false}
                  required="Select at least one"
                  disabled={isAppLoading}
                />
                <div className="margin-top-4">
                  <label htmlFor={GROUP_FIELD_NAMES.NAME} className="display-block margin-bottom-1">
                    Who do you want to share this group with?
                    <QuestionTooltip text="Shared groups can be seen and used by others but only you and co-owners can edit the group." />
                  </label>
                  <Controller
                    control={control}
                    name={GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE}
                    render={({ onChange: controllerOnChange, value }) => (
                      <>
                        <Radio
                          label="Everyone with access to my region"
                          id="everyone-with-access"
                          name="everyone-with-access"
                          checked={value === 'everyone'}
                          onChange={() => controllerOnChange('everyone')}
                          disabled={isAppLoading}
                        />
                        <Radio
                          label="Individuals in my region"
                          id="individuals-in-my-region"
                          name="individuals-in-my-region"
                          checked={value === 'individuals'}
                          onChange={() => controllerOnChange('individuals')}
                          disabled={isAppLoading}
                        />
                      </>
                    )}
                  />
                </div>
                {
                  shareWithEveryone === 'individuals' && (
                    <div className="margin-top-4">
                      <label htmlFor={GROUP_FIELD_NAMES.INDIVIDUALS} className="display-block margin-bottom-1">
                        Invite individuals
                        {' '}
                        <Req />
                      </label>
                      {nameError && <span className="usa-error-message">{individualsError.message}</span>}
                      <MultiSelect
                        name={GROUP_FIELD_NAMES.INDIVIDUALS}
                        options={individuals}
                        control={control}
                        simple={false}
                        required="Select at least one"
                        disabled={isAppLoading}
                      />
                    </div>
                  )
                }
              </div>
            )}
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
