import React, { useState, useEffect, useContext } from 'react'
import { useForm, useController, FormProvider } from 'react-hook-form'
import { Helmet } from 'react-helmet'
import { Alert, Button, Checkbox, Dropdown, FormGroup, Label, Textarea } from '@trussworks/react-uswds'
import { Link } from 'react-router-dom'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import Container from '../../../components/Container'
import Req from '../../../components/Req'
import GoalSource from '../../../components/GoalForm/GoalSource'
import { getCreatorsByRegion, getGroupsByRegion, getCuratedTemplates, createMultiRecipientGoalsFromAdmin } from '../../../fetchers/Admin'
import { getGoalTemplatePrompts } from '../../../fetchers/goalTemplates'
import ConditionalFieldsForHookForm from '../../ActivityReport/Pages/components/ConditionalFieldsForHookForm'
import AppLoadingContext from '../../../AppLoadingContext'
import { REGIONS } from './constants'

export default function Create() {
  const [groupOptions, setGroupOptions] = useState([])
  const [curatedGoalOptions, setCuratedGoalOptions] = useState([])
  const [creatorOptions, setCreatorOptions] = useState([])
  const [prompts, setPrompts] = useState(null)
  const [response, setResponse] = useState(null)
  const { setIsAppLoading } = useContext(AppLoadingContext)

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
  })

  const { register, watch } = hookForm
  const { region, createReport, useCuratedGoal, group, templateId } = watch()

  const {
    field: { onChange: onUpdateGoalSource, onBlur: onBlurGoalSource, value: goalSource, name: goalSourceInputName },
  } = useController({
    control: hookForm.control,
    name: 'goalSource',
    rules: {},
    defaultValue: '',
  })

  useEffect(() => {
    async function updateAdditionalData() {
      try {
        if (!region) {
          return
        }
        const [creators, groups] = await Promise.all([getCreatorsByRegion(region), getGroupsByRegion(region)])
        setCreatorOptions(creators)
        setGroupOptions(groups)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err)
      }
    }
    updateAdditionalData()
  }, [region])

  useEffect(() => {
    async function fetchCuratedTemplates() {
      try {
        const templates = await getCuratedTemplates()
        setCuratedGoalOptions(templates)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err)
      }
    }

    fetchCuratedTemplates()
  }, [])

  /**
   * this hook will fetch the prompts for the curated template
   */
  useEffect(() => {
    async function fetchPrompts() {
      try {
        const templatePrompts = await getGoalTemplatePrompts(templateId)
        setPrompts(templatePrompts)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err)
      }
    }

    if (templateId) {
      fetchPrompts()
    } else {
      setPrompts(null)
    }
  }, [templateId])

  /**
   * If we are using a curated goal, clear out the goal text
   * If we are not using a curated goal, clear out the templateId
   */
  useEffect(() => {
    if (useCuratedGoal) {
      hookForm.setValue('goalText', '')
    } else {
      hookForm.setValue('templateId', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCuratedGoal]) // I am not adding hookForm to this, it makes no sense to work around that

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true)
      const created = await createMultiRecipientGoalsFromAdmin(data)
      setResponse(created)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err)
      setResponse({
        isError: true,
        message: 'An error occurred while creating the goals.',
      })
    } finally {
      setIsAppLoading(false)
    }
  }

  const selectedGroup = groupOptions.find((g) => g.id === Number(group))

  if (response && !response.isError) {
    return (
      <>
        <Helmet>
          <title>Create goals</title>
        </Helmet>
        <Container>
          <h2>Create goals</h2>
          <p className="usa-prose">Successfully created {response.goals.length} goals.</p>
          {response.message && <p className="usa-prose">{response.message}</p>}
          {response.activityReport && (
            <p className="usa-prose">
              Successfully created activity report{' '}
              <Link to={`/activity-reports/${response.activityReport.id}`}>{response.activityReport.displayId}</Link>.
            </p>
          )}
          <p>
            <Button
              type="button"
              unstyled
              onClick={() => {
                hookForm.reset()
                setResponse(null)
              }}
            >
              Create another goal
            </Button>
          </p>
        </Container>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Create goals</title>
      </Helmet>
      <Container>
        <h2 className="margin-top-0">Create goals</h2>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <form className="usa-form maxw-tablet" onSubmit={hookForm.handleSubmit(onSubmit)}>
            <FormGroup className="usa-form-group" required>
              <Label htmlFor="region">
                Region <Req />
              </Label>
              <Dropdown id="region" name="region" inputRef={register({ required: true })} required>
                <option value="" disabled selected hidden>
                  Select
                </option>
                {REGIONS.map((r) => (
                  <option key={`region${r}`} value={r}>
                    Region {r}
                  </option>
                ))}
              </Dropdown>
            </FormGroup>
            <FormGroup className="usa-form-group" required>
              <Label htmlFor="group">
                Recipient group <Req />
              </Label>
              <Dropdown id="group" name="group" inputRef={register({ required: true })} required>
                <option value="" disabled selected hidden>
                  Select
                </option>
                {groupOptions.map((g) => (
                  <option key={`group${g.id}`} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Dropdown>
              {group && selectedGroup && (
                <>
                  <ul className="usa-list">
                    {selectedGroup.grants.map((g) => (
                      <li key={`grant${g.id}`}>{g.recipientInfo}</li>
                    ))}
                  </ul>
                  <input type="hidden" name="selectedGrants" id="selectedGrants" value={JSON.stringify(selectedGroup.grants)} ref={register()} />
                </>
              )}
            </FormGroup>
            <FormGroup className="usa-form-group" required>
              <Checkbox label="Create a new activity report" name="createReport" id="createReport" inputRef={register()} />
            </FormGroup>
            {createReport && (
              <FormGroup className="usa-form-group" required>
                <Label htmlFor="creator">
                  Activity report creator <Req />
                </Label>
                <Dropdown id="creator" name="creator" inputRef={register({ required: true })} required>
                  <option value="" disabled selected hidden>
                    Select
                  </option>
                  {creatorOptions.map((c) => (
                    <option key={`user${c.id}`} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Dropdown>
              </FormGroup>
            )}

            <FormGroup className="usa-form-group" required>
              {useCuratedGoal ? (
                <>
                  <Label htmlFor="templateId">
                    OHS standard goal <Req />
                  </Label>
                  <Dropdown id="templateId" name="templateId" inputRef={register({ required: true })} required>
                    {curatedGoalOptions.map((g) => (
                      <option key={`curatedGoalOption${g.id}`} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </Dropdown>
                </>
              ) : (
                <>
                  <Label htmlFor="goalText">
                    Goal <Req />
                  </Label>
                  <Textarea id="goalText" name="goalText" inputRef={register({ required: true })} />
                </>
              )}
            </FormGroup>
            <FormGroup>
              <Checkbox label="Use standard OHS goal" name="useCuratedGoal" id="useCuratedGoal" inputRef={register()} />
            </FormGroup>

            {prompts && <ConditionalFieldsForHookForm prompts={prompts} userCanEdit />}

            <GoalSource
              error={<></>}
              source={goalSource}
              validateGoalSource={onBlurGoalSource}
              onChangeGoalSource={onUpdateGoalSource}
              goalStatus={GOAL_STATUS.NOT_STARTED}
              inputName={goalSourceInputName}
              isLoading={false}
              userCanEdit
              isMultiRecipientGoal={false}
              required={false}
            />

            <FormGroup>
              <Checkbox
                label="Skip creating goals for recipients who already have them"
                name="createMissingGoals"
                id="createMissingGoals"
                inputRef={register()}
              />

              <div className="usa-hint">
                Checking this box means instead of showing an error, existing goals will be skipped. (Existing goals will not be updated)
              </div>
            </FormGroup>

            {response && response.isError && <Alert type="error">{response.message}</Alert>}

            <Button type="submit">Submit</Button>
          </form>
        </FormProvider>
      </Container>
    </>
  )
}
