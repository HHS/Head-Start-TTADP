/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState, useContext } from 'react';
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
import MultiSelect from '../../components/MultiSelect';
import {
  createGroup, fetchGroup, updateGroup, getGroupUsers, getGroupGrants,
} from '../../fetchers/groups';
import { MyGroupsContext } from '../../components/MyGroupsProvider';
import AppLoadingContext from '../../AppLoadingContext';
import QuestionTooltip from '../../components/GoalForm/QuestionTooltip';

const mapSelectedRecipients = (grants) => grants.map((grant) => ({
  value: grant.id,
  label: grant.recipientInfo,
}));

const reduceRecipients = (fetchedRecipients) => (
  // Reduce the response to a format that the MultiSelect component can use.
  fetchedRecipients.reduce((acc, recipient) => {
    // Check if the recipient is already in the accumulator, else add it.
    let existingRecipient = acc.find((a) => a.label === recipient.name);
    if (!existingRecipient) {
      existingRecipient = { label: recipient.name, options: [] };
      acc.push(existingRecipient); // Add the new recipient to the accumulator.
    }
    // Add the grant to the recipient.
    existingRecipient.options.push({
      value: recipient.grantId,
      label: `${recipient.name} - ${recipient.grantNumber}${recipient.programTypes.length > 0 ? ` - ${recipient.programTypes.join(', ')}` : ''}`,
    });
    return acc;
  }, [])
);

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
      [GROUP_FIELD_NAMES.IS_PRIVATE]: false,
      [GROUP_FIELD_NAMES.CO_OWNERS]: [],
      [GROUP_FIELD_NAMES.INDIVIDUALS]: [],
      [GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE]: null,
    },
  });

  const watchIsPrivate = watch(GROUP_FIELD_NAMES.IS_PRIVATE);
  const watchShareWithEveryone = watch(GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE);
  const watchCoOwners = watch(GROUP_FIELD_NAMES.CO_OWNERS);
  const watchIndividuals = watch(GROUP_FIELD_NAMES.INDIVIDUALS);

  const { groupId } = match.params;
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [error, setError] = useState(null);
  const history = useHistory();
  const [recipientsFetched, setRecipientsFetched] = useState(false);
  const [usersFetched, setUsersFetched] = useState(false);
  // see the comment above "onSubmit" for, well, context
  const { myGroups, setMyGroups } = useContext(MyGroupsContext);
  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    async function getGroup() {
      setIsAppLoading(true);
      try {
        const fetchedGroup = await fetchGroup(groupId);

        if (fetchedGroup) {
          // Set name.
          setValue(GROUP_FIELD_NAMES.NAME, fetchedGroup.name);

          // Set share with everyone (we need to make sure this is initially on the form).
          setValue(GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE, 'individuals');

          // Set recipients.
          setValue(GROUP_FIELD_NAMES.RECIPIENTS, mapSelectedRecipients(fetchedGroup.grants));
          // Set is private.
          setValue(GROUP_FIELD_NAMES.IS_PRIVATE, !fetchedGroup.isPublic);
          // Set group co-owners.
          setValue(GROUP_FIELD_NAMES.CO_OWNERS, fetchedGroup.coOwners.map((coOwner) => (
            { value: coOwner.id, label: coOwner.name }
          )));
          // Set group individuals.
          setValue(GROUP_FIELD_NAMES.INDIVIDUALS, fetchedGroup.sharedWith.map((s) => (
            { value: s.id, label: s.name }
          )));

          // Set share with everyone.
          if (fetchedGroup.sharedWith.length === 0) {
            setValue(GROUP_FIELD_NAMES.SHARE_WITH_EVERYONE, 'everyone');
          }
        }
      } catch (err) {
        setError('There was an error fetching your group');
      } finally {
        setIsAppLoading(false);
      }
    }

    // load existing group data from API based on query param
    if (groupId && usersFetched && recipientsFetched) {
      getGroup();
    }
  }, [groupId, setIsAppLoading, setValue, usersFetched, recipientsFetched]);

  useEffect(() => {
    // get grants/recipients for user
    async function fetchRecipients() {
      setIsAppLoading(true);
      try {
        const fetchedRecipients = await getGroupGrants(groupId || 'new');

        // Map recipients.
        const recipientsMapped = reduceRecipients(fetchedRecipients);
        setRecipientOptions(recipientsMapped);
        setRecipientsFetched(true);
      } catch (err) {
        setError('There was an error fetching your recipients');
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!recipientsFetched) {
      fetchRecipients();
    }
  }, [groupId, recipientsFetched, setIsAppLoading]);

  useEffect(() => {
    // get co-owners and individuals.
    async function fetchUsers() {
      setIsAppLoading(true);
      try {
        // Get co-owners and individuals for selected recipients.
        const groupUsers = await getGroupUsers(groupId || 'new');

        // Set available.
        const mappedUsers = groupUsers.map((user) => ({
          value: user.userId, label: user.name,
        }));

        setUserOptions(mappedUsers);

        // Set users fetched.
        setUsersFetched(true);
      } catch (err) {
        setError('There was an error fetching co-owners and individuals');
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!usersFetched) {
      fetchUsers();
    }
  }, [groupId, setIsAppLoading, usersFetched]);

  // you'll notice that "setMyGroups" is called below
  // - since we fetch that data once, way earlier, in App.js, we must update it here
  // if a user creates or updates a group. Given that we are working in SPA, it's
  // very possible that a user will create a group, then navigate to the a page and expect to use
  // it without refreshing, so that data will not be refreshed from the API
  const onSubmit = async (data) => {
    // Co-owners is not required but limits up to 3.
    if (watchCoOwners && watchCoOwners.length > 3) {
      setFormError(GROUP_FIELD_NAMES.CO_OWNERS, { message: 'You can only choose up to three co-owners.', shouldFocus: true });
      return;
    }

    const post = {
      grants: data[GROUP_FIELD_NAMES.RECIPIENTS].map(({ value }) => (value)),
      name: data[GROUP_FIELD_NAMES.NAME],
      isPublic: !data[GROUP_FIELD_NAMES.IS_PRIVATE],
      // Co-owners and Shared with Individuals might not be on the form.
      coOwners: data[GROUP_FIELD_NAMES.CO_OWNERS]
        ? data[GROUP_FIELD_NAMES.CO_OWNERS].map(({ value }) => (value))
        : [],
      sharedWith: data[GROUP_FIELD_NAMES.INDIVIDUALS]
        ? data[GROUP_FIELD_NAMES.INDIVIDUALS].map(({ value }) => (value))
        : [],
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

  const filterCoOwnerOptions = () => {
    if (!usersFetched) return [];
    let updatedCoOwnerOptions = [...userOptions];

    if (usersFetched && watchIndividuals && watchIndividuals.length) {
      const selectedIndividuals = watchIndividuals.map((i) => i.value);
      updatedCoOwnerOptions = updatedCoOwnerOptions.filter(
        (user) => !selectedIndividuals.includes(user.value),
      );
    }
    return updatedCoOwnerOptions;
  };

  const filterIndividualOptions = () => {
    if (!usersFetched) return [];
    let updatedIndividualOptions = [...userOptions];

    if (watchCoOwners && watchCoOwners.length) {
      const selectedCoOwners = watchCoOwners.map((i) => i.value);
      updatedIndividualOptions = updatedIndividualOptions.filter(
        (user) => !selectedCoOwners.includes(user.value),
      );
    }
    return updatedIndividualOptions;
  };

  return (
    <>
      <Helmet>
        <title>My Groups</title>
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
                options={recipientOptions}
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
            {!watchIsPrivate && (
              <div className="margin-top-4">
                <label className="display-block margin-bottom-1">
                  Add co-owner
                  {' '}
                  {coOwnerError && <span className="usa-error-message">{coOwnerError.message}</span>}
                  <div>
                    <span className="usa-hint">
                      Choose up to 3 co-owners who can change permissions and edit the group.
                    </span>
                  </div>
                  <MultiSelect
                    name={GROUP_FIELD_NAMES.CO_OWNERS}
                    options={filterCoOwnerOptions()}
                    control={control}
                    simple={false}
                    required={false}
                    disabled={isAppLoading}
                  />
                </label>
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
                  watchShareWithEveryone === 'individuals' && (
                    <div className="margin-top-4">
                      <label className="display-block margin-bottom-1">
                        Invite individuals
                        {' '}
                        <Req />
                        {individualsError && <span className="usa-error-message">{individualsError.message}</span>}
                        <MultiSelect
                          name={GROUP_FIELD_NAMES.INDIVIDUALS}
                          options={filterIndividualOptions()}
                          control={control}
                          simple={false}
                          required="Select at least one"
                          disabled={isAppLoading}
                        />
                      </label>
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
