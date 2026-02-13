import React, { useState, useEffect, useContext, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { useForm, FormProvider, useController } from 'react-hook-form'
import { GOAL_CLOSE_REASONS } from '@ttahub/common'
import { Helmet } from 'react-helmet'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { Button, Dropdown, Fieldset, FormGroup, Label, Table, Textarea, Radio, Alert, ModalToggleButton } from '@trussworks/react-uswds'
import Select from 'react-select'
import { uniqueId, uniq } from 'lodash'
import Container from '../../../components/Container'
import Req from '../../../components/Req'
import { getGroupsByRegion, closeMultiRecipientGoalsFromAdmin } from '../../../fetchers/Admin'
import { getGoals } from '../../../fetchers/activityReports'
import AppLoadingContext from '../../../AppLoadingContext'
import { REGIONS } from './constants'
import selectOptionsReset from '../../../components/selectOptionsReset'
import ReadOnlyField from '../../../components/ReadOnlyField'
import Modal from '../../../components/VanillaModal'
import colors from '../../../colors'

const findOrFailExistingGoal = (needle, haystack) => haystack.find((g) => g.status === needle.status && g.name.trim() === needle.name.trim())

const reduceAndSortGoals = (goals) => {
  const reducedGoals = goals.reduce((acc, goal) => {
    const existingGoal = findOrFailExistingGoal(goal, acc)
    if (existingGoal) {
      existingGoal.goalIds = uniq([...existingGoal.goalIds, ...goal.goalIds])
      existingGoal.grantIds = uniq([...existingGoal.grantIds, ...goal.grantIds])
      return acc
    }

    return [...acc, { ...goal, id: uniqueId('goal_') }]
  }, [])

  return [...reducedGoals].sort((a, b) => a.name.localeCompare(b.name))
}

const CloseRadios = ({ register }) =>
  GOAL_CLOSE_REASONS.map((r) => (
    <Radio
      id={r.trim().replace(' ', '-').toLowerCase()}
      key={r}
      name="closeSuspendReason"
      label={r}
      value={r}
      className="smart-hub--report-checkbox"
      inputRef={register()}
      required
    />
  ))

CloseRadios.propTypes = {
  register: PropTypes.func.isRequired,
}

export default function Close() {
  const [groupOptions, setGroupOptions] = useState([])
  const [goalOptions, setGoalOptions] = useState([])
  const [response, setResponse] = useState(null)
  const { setIsAppLoading } = useContext(AppLoadingContext)

  const modalRef = useRef(null)

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      region: null,
      group: null,
      closeSuspendReason: '',
      closeSuspendContext: null,
      selectedGoal: null,
    },
  })

  const { register, watch } = hookForm
  const { region, group } = watch()

  const {
    field: { onChange: onUpdateSelectedGoal, onBlur: onBlurSelectedGoal, value: selectedGoal, name: selectedGoalInputName },
  } = useController({
    control: hookForm.control,
    name: 'selectedGoal',
    rules: {},
    defaultValue: null,
  })

  const selectedGroup = useMemo(() => groupOptions.find((g) => g.id === Number(group)), [group, groupOptions])

  useEffect(() => {
    async function getGoalOptions() {
      try {
        if (!selectedGroup) {
          return
        }
        setIsAppLoading(true)
        const grantIds = selectedGroup.grants.map((g) => g.id)
        const goals = await getGoals(grantIds)
        setGoalOptions(reduceAndSortGoals(goals))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err)
      } finally {
        setIsAppLoading(false)
      }
    }

    getGoalOptions()
  }, [selectedGroup, setIsAppLoading])

  useEffect(() => {
    async function updateAdditionalData() {
      try {
        if (!region) {
          return
        }
        setIsAppLoading(true)
        const groups = await getGroupsByRegion(region)
        setGroupOptions(groups)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err)
      } finally {
        setIsAppLoading(false)
      }
    }
    updateAdditionalData()
  }, [region, setIsAppLoading])

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true)
      setResponse(await closeMultiRecipientGoalsFromAdmin(data))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err)
      setResponse({
        isError: true,
        message: 'An error occurred while closing the goals.',
      })
      modalRef.current.toggleModal()
    } finally {
      setIsAppLoading(false)
    }
  }

  if (response && !response.isError) {
    return (
      <>
        <Helmet>
          <title>Close goals</title>
        </Helmet>
        <Container>
          <h2>Close goals</h2>
          <p>Successfully closed {response.goals.length} goals.</p>
          <p>
            <Button
              type="button"
              unstyled
              onClick={() => {
                setGroupOptions([])
                setGoalOptions([])
                hookForm.reset()
                setResponse(null)
              }}
            >
              Close more goals
            </Button>
          </p>
        </Container>
      </>
    )
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
          <form className="usa-form maxw-tablet">
            <Modal modalRef={modalRef} heading="Close goals">
              <p>Are you sure?</p>
              <Button type="submit" className="margin-right-1" onClick={(e) => hookForm.handleSubmit((data) => onSubmit(data))(e)}>
                Yes, close goals
              </Button>
              <ModalToggleButton className="usa-button--subtle" closer modalRef={modalRef} data-focus="true">
                No, go back
              </ModalToggleButton>
            </Modal>
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
                <details className="border border-base-light padding-1 margin-y-1 radius-md">
                  <summary>Grants in group</summary>
                  <ul className="usa-list">
                    {selectedGroup.grants.map((g) => (
                      <li key={`grant${g.id}`}>{g.recipientInfo}</li>
                    ))}
                  </ul>
                </details>
              )}
            </FormGroup>
            <FormGroup>
              <Label required htmlFor={selectedGoalInputName}>
                Select goal to close <Req />
                <br />
                <span className="usa-hint">
                  All objectives under selected goals that have appeared on approved activity reports will be closed also.
                </span>
              </Label>
              <Select
                inputId={selectedGoalInputName}
                required
                name={selectedGoalInputName}
                options={goalOptions}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id}
                onChange={onUpdateSelectedGoal}
                value={selectedGoal}
                styles={selectOptionsReset}
                onBlur={onBlurSelectedGoal}
                className="usa-select"
              />
            </FormGroup>
            {selectedGoal && (
              <div>
                <details className="border border-base-light padding-1 margin-y-1 radius-md">
                  <summary>Selected goal details</summary>
                  <ReadOnlyField label="Name">{selectedGoal.name}</ReadOnlyField>
                  <ReadOnlyField label="Status">{selectedGoal.status}</ReadOnlyField>
                  <Table stackedStyle="default">
                    <thead>
                      <tr>
                        <th scope="col">Grants</th>
                        <th scope="col">Has goal?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedGroup ? selectedGroup.grants : []).map((grant) => (
                        <tr key={uniqueId('grant_table_id_')}>
                          <td data-label="Grants">{grant.recipientInfo}</td>
                          <td data-label="Has goal?" align="center">
                            {selectedGoal.grantIds.includes(grant.id) ? (
                              <FontAwesomeIcon icon={faCheckCircle} color={colors.successDarker} />
                            ) : (
                              <FontAwesomeIcon icon={faCircleXmark} color={colors.error} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </details>

                <FormGroup>
                  <Fieldset>
                    <legend>
                      Select reason for closing goal and objectives <Req />
                      <br />
                      <span className="usa-hint">This will overwrite any existing reasons.</span>
                    </legend>
                    <CloseRadios register={register} />
                  </Fieldset>
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="closeSuspendReasonContext">Additional context</Label>
                  <Textarea id="closeSuspendReasonContext" name="closeSuspendReasonContext" type="text" inputRef={register()} />
                </FormGroup>
              </div>
            )}
            {response && response.isError && <Alert type="error">{response.message}</Alert>}

            <ModalToggleButton modalRef={modalRef}>Submit</ModalToggleButton>
          </form>
        </FormProvider>
      </Container>
    </>
  )
}
