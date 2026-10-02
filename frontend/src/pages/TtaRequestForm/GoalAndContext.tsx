import { Alert } from '@trussworks/react-uswds';
import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import Drawer from '../../components/Drawer';
import FormItem from '../../components/FormItem';
import FormItemWithDrawerTriggerLabel from '../../components/FormItemWithDrawerTriggerLabel';
import HookFormRichEditor from '../../components/HookFormRichEditor';
import MultiSelect from '../../components/MultiSelect';
import selectOptionsReset from '../../components/selectOptionsReset';
import useGoalTemplates from '../../hooks/useGoalTemplates';
import {
  MONITORING_STANDARD,
  RTTAPA_ALERT,
  SELECT_PLACEHOLDER,
  TTA_REQUEST_FIELDS,
} from './constants';
import type { GoalTemplateOption, TtaRequestGrant } from './types';
import useTtaRequestCitations from './useTtaRequestCitations';

const CONTEXT_LABEL = 'Provide background or context for this request';

interface GoalAndContextProps {
  /** the region the selected grants are in, or null until a grant is chosen */
  regionId: number | null;
}

/**
 * The goal the request is about, the citations behind it when it is the monitoring goal,
 * and the background the reviewer needs. Goals are per grant, so nothing here has options
 * until a grant has been selected.
 */
export default function GoalAndContext({ regionId }: GoalAndContextProps): React.ReactElement {
  const { control, setValue, watch } = useFormContext();
  const goalDrawerTriggerRef = useRef(null);
  const citationDrawerTriggerRef = useRef(null);

  const selectedGrants: TtaRequestGrant[] = watch(TTA_REQUEST_FIELDS.GRANTS);
  const selectedGoal: GoalTemplateOption | null = watch(TTA_REQUEST_FIELDS.GOAL);

  const goalTemplates = useGoalTemplates(selectedGrants);
  const isMonitoringGoal = selectedGoal?.standard === MONITORING_STANDARD;

  const grantIds = useMemo(() => selectedGrants.map((grant) => grant.id), [selectedGrants]);
  const { citationOptions } = useTtaRequestCitations(regionId, grantIds, isMonitoringGoal);

  // citations belong to the monitoring goal, so they cannot outlive a switch away from it
  useEffect(() => {
    if (!isMonitoringGoal) {
      setValue(TTA_REQUEST_FIELDS.CITATIONS, []);
    }
  }, [isMonitoringGoal, setValue]);

  return (
    <>
      <h3 className="margin-top-4 margin-bottom-2">Goal and context</h3>
      <Alert type="info" headingLevel="h4" slim className="margin-bottom-3 maxw-mobile-lg">
        {RTTAPA_ALERT}
      </Alert>
      {/* the drawers are empty until their content is written, in a separate ticket */}
      <Drawer triggerRef={goalDrawerTriggerRef} stickyHeader stickyFooter title="Goal guidance" />
      <FormItemWithDrawerTriggerLabel
        label="Select goal"
        name={TTA_REQUEST_FIELDS.GOAL}
        drawerTriggerRef={goalDrawerTriggerRef}
        drawerTriggerLabel="Get help selecting a goal"
        required
      >
        <Controller
          name={TTA_REQUEST_FIELDS.GOAL}
          control={control}
          rules={{ required: 'Select a goal' }}
          defaultValue={null}
          render={({ value, onChange, onBlur }) => (
            <Select
              inputId={TTA_REQUEST_FIELDS.GOAL}
              name={TTA_REQUEST_FIELDS.GOAL}
              className="usa-select"
              styles={selectOptionsReset}
              options={goalTemplates || []}
              placeholder={SELECT_PLACEHOLDER}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => String(option.id)}
            />
          )}
        />
      </FormItemWithDrawerTriggerLabel>
      {isMonitoringGoal && (
        <>
          <Drawer
            triggerRef={citationDrawerTriggerRef}
            stickyHeader
            stickyFooter
            title="Citation guidance"
          />
          <FormItemWithDrawerTriggerLabel
            label="Citations being addressed"
            name={TTA_REQUEST_FIELDS.CITATIONS}
            drawerTriggerRef={citationDrawerTriggerRef}
            drawerTriggerLabel="Get help choosing citations"
            required
          >
            <MultiSelect
              name={TTA_REQUEST_FIELDS.CITATIONS}
              control={control}
              options={citationOptions}
              simple={false}
              placeholderText={SELECT_PLACEHOLDER}
              required="Select at least one citation"
            />
          </FormItemWithDrawerTriggerLabel>
        </>
      )}
      <FormItem label={CONTEXT_LABEL} name={TTA_REQUEST_FIELDS.CONTEXT} required>
        <div className="margin-top-1">
          <HookFormRichEditor
            name={TTA_REQUEST_FIELDS.CONTEXT}
            id={TTA_REQUEST_FIELDS.CONTEXT}
            ariaLabel={CONTEXT_LABEL}
            required
            errorMessage="Provide background or context for this request"
          />
        </div>
      </FormItem>
    </>
  );
}
