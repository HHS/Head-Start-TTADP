import { useMemo } from 'react';
import useFetch from './useFetch';
import { getRegionalTrainerOptions, getNationalCenterTrainerOptions } from '../fetchers/users';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';

export default function useSessionStaff(event) {
  let eventOrganizer = '';
  let facilitation = '';

  if (event && event.data) {
    eventOrganizer = event.data.eventOrganizer;
    facilitation = event.data.facilitation;
  }

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
      if (facilitation === 'national_center') {
        optionsForValue = nationalCenterTrainers;
        trainerOptions = nationalCenterTrainers;
      }

      if (facilitation === 'regional_tta_staff') {
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
  }, [eventOrganizer, facilitation, nationalCenterTrainers, regionalTrainers]);
}
