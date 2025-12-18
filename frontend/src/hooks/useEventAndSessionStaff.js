import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from './useFetch';
import { getRegionalTrainerOptions, getNationalCenterTrainerOptions } from '../fetchers/users';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';

export default function useEventAndSessionStaff(event, isEvent = false) {
  const { watch } = useFormContext();

  const facilitation = watch('facilitation');

  const eventOrganizer = useMemo(() => {
    if (event && event.data && event.data.eventOrganizer) {
      return event.data.eventOrganizer;
    }

    if (event && event.eventOrganizer) {
      return event.eventOrganizer;
    }

    return '';
  }, [event]);

  const {
    data: regionalTrainers,
  } = useFetch(
    [],
    async () => (event?.regionId ? getRegionalTrainerOptions(String(event.regionId)) : []),
    [event?.regionId],
  );

  const {
    data: nationalCenterTrainers,
  } = useFetch(
    [],
    async () => (event?.regionId ? getNationalCenterTrainerOptions(String(event.regionId)) : []),
    [event?.regionId],
  );

  return useMemo(() => {
    let optionsForValue = [];
    let trainerOptions = [];

    if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS) {
      optionsForValue = regionalTrainers;
      trainerOptions = regionalTrainers;
    }

    if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS) {
      // if facilitation is region, we are already set to the correct values

      if (facilitation === 'national_center' || isEvent) {
        optionsForValue = nationalCenterTrainers;
        trainerOptions = nationalCenterTrainers;
      }

      if (facilitation === 'both') {
        optionsForValue = [...nationalCenterTrainers, ...regionalTrainers];
        trainerOptions = [
          {
            label: 'National Center trainers',
            options: nationalCenterTrainers,
          },
          {
            label: 'Regional trainers',
            options: regionalTrainers,
          },
        ];
      }
    }

    return {
      trainerOptions,
      optionsForValue,
    };
  }, [eventOrganizer, facilitation, isEvent, nationalCenterTrainers, regionalTrainers]);
}
