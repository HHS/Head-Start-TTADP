import React, { useState, useEffect, useContext } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Helmet } from 'react-helmet';
import {
  Button,
  Dropdown,
  FormGroup,
  Label,
} from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import Container from '../../../components/Container';
import Req from '../../../components/Req';
import {
  getGroupsByRegion,
} from '../../../fetchers/Admin';
import AppLoadingContext from '../../../AppLoadingContext';
import { REGIONS } from './constants';

export default function Close() {
  const [groupOptions, setGroupOptions] = useState([]);
  const [response, setResponse] = useState(null);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      region: null,
      createReport: false,
      creator: null,
      group: null,
      goalText: '',
      useCuratedGoal: false,
      goalSource: '',
      goalDate: '',
      templateId: null,
    },
  });

  const { register, watch } = hookForm;
  const {
    region,
    group,
  } = watch();

  useEffect(() => {
    async function updateAdditionalData() {
      try {
        if (!region) {
          return;
        }
        const groups = await getGroupsByRegion(region);
        setGroupOptions(groups);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
      }
    }
    updateAdditionalData();
  }, [region]);

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true);

      // send submission to server
      // eslint-disable-next-line no-console
      console.log(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      setResponse({
        isError: true,
        message: 'An error occurred while creating the goals.',
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  const selectedGroup = groupOptions.find((g) => g.id === (Number(group)));

  if (response && !response.isError) {
    return (
      <>
        <Helmet>
          <title>Close goals</title>
        </Helmet>
        <Container>
          <h2>Close goals</h2>
          <p>
            Successfully created
            {' '}
            {response.goals.length}
            {' '}
            goals.
          </p>
          {response.activityReport && (
            <p>
              Successfully created activity report
              {' '}
              <Link to={`/activity-reports/${response.activityReport.id}`}>
                {response.activityReport.displayId}
              </Link>
              .
            </p>
          )}
          <p>
            <Button
              type="button"
              unstyled
              onClick={() => {
                hookForm.reset();
                setResponse(null);
              }}
            >
              Create another goal
            </Button>
          </p>
        </Container>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Close goals</title>
      </Helmet>
      <Container>
        <h2 className="margin-top-0">Close goals</h2>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <form className="usa-form" onSubmit={hookForm.handleSubmit(onSubmit)}>
            <FormGroup className="usa-form-group" required>
              <Label htmlFor="region">
                Region
                {' '}
                <Req />
              </Label>
              <Dropdown id="region" name="region" inputRef={register({ required: true })} required>
                <option value="" disabled selected hidden>Select</option>
                {REGIONS.map((r) => (
                  <option key={`region${r}`} value={r}>
                    Region
                    {' '}
                    {r}
                  </option>
                ))}
              </Dropdown>
            </FormGroup>
            <FormGroup className="usa-form-group" required>
              <Label htmlFor="group">
                Recipient group
                {' '}
                <Req />
              </Label>
              <Dropdown id="group" name="group" inputRef={register({ required: true })} required>
                <option value="" disabled selected hidden>Select</option>
                {groupOptions.map((g) => (
                  <option key={`group${g.id}`} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Dropdown>
              {(group && selectedGroup) && (
                <>
                  <ul className="usa-list">
                    {selectedGroup.grants.map((g) => (
                      <li key={`grant${g.id}`}>
                        {g.recipientInfo}
                      </li>
                    ))}
                  </ul>
                  <input type="hidden" name="selectedGrants" id="selectedGrants" value={JSON.stringify(selectedGroup.grants)} ref={register()} />
                </>
              )}
            </FormGroup>
            <Button type="submit">Submit</Button>
          </form>
        </FormProvider>

      </Container>
    </>
  );
}
