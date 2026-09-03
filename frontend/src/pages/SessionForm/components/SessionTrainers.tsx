import { Textarea } from '@trussworks/react-uswds';
import React, { useEffect, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import { TRAINING_EVENT_ORGANIZER } from '../../../Constants';
import FormItem from '../../../components/FormItem';
import selectOptionsReset from '../../../components/selectOptionsReset';
import useEventAndSessionStaff from '../../../hooks/useEventAndSessionStaff';

type TrainerOption = {
  fullName: string;
  id: number | 'other';
};

export default function SessionTrainers({
  event,
}: {
  event: {
    regionId: number;
    data: {
      endDate: string;
      eventOrganizer: string;
      facilitation: string;
    };
  };
}): React.ReactElement {
  const { watch, register, control, setValue } = useFormContext();

  const otherTrainers = watch('otherTrainers');
  const trainers = watch('trainers');

  const { trainerOptions } = useEventAndSessionStaff(event);

  const trainerOptionsComputed = useMemo(() => {
    return [
      ...trainerOptions,
      {
        label: 'Other trainers',
        options: [
          {
            fullName: 'Other',
            id: 'other',
          },
        ],
      },
    ];
  }, [trainerOptions]);

  const showOtherTrainers = useMemo(() => {
    return trainers?.length && trainers.some((t: TrainerOption) => t.id === 'other');
  }, [trainers]);

  useEffect(() => {
    if (otherTrainers && trainers?.every((t: TrainerOption) => t.id !== 'other')) {
      setValue('trainers', [...trainers, { fullName: 'Other', id: 'other' }]);
    }
  }, [otherTrainers, trainers, setValue]);

  return (
    <>
      <div>
        <FormItem label="Who provided the TTA?" name="trainers" required>
          <Controller
            render={({ onChange: controllerOnChange, value, onBlur }) => (
              <Select
                value={value}
                inputId="trainers"
                name="trainers"
                className="usa-select"
                styles={selectOptionsReset}
                onBlur={onBlur}
                components={{
                  DropdownIndicator: null,
                }}
                onChange={(selectedOptions) => {
                  if (!selectedOptions.some((t: TrainerOption) => t.id === 'other')) {
                    setValue('otherTrainers', '');
                  }

                  controllerOnChange(selectedOptions);
                }}
                options={trainerOptionsComputed}
                getOptionLabel={(option) => option.fullName}
                getOptionValue={(option) => option.id}
                isMulti
                required
              />
            )}
            control={control}
            rules={{
              validate: (value: TrainerOption[]) => {
                if (!value || value.length === 0) {
                  return 'Select at least one trainer';
                }
                return true;
              },
            }}
            name="trainers"
            defaultValue={[]}
          />
        </FormItem>
      </div>

      {!!showOtherTrainers && (
        <div>
          <FormItem label="Other trainers" name="otherTrainers" required>
            <Textarea
              id="otherTrainers"
              name="otherTrainers"
              inputRef={register({
                validate: (value) => (value?.trim() ? true : 'Enter other trainers'),
              })}
            />
          </FormItem>
        </div>
      )}
    </>
  );
}
