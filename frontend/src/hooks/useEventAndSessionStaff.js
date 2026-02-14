import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import useFetch from './useFetch'
import { getRegionalTrainerOptions, getNationalCenterTrainerOptions } from '../fetchers/users'
import { TRAINING_EVENT_ORGANIZER } from '../Constants'

export default function useEventAndSessionStaff(event, isEvent = false) {
  const { watch } = useFormContext()

  const facilitation = watch('facilitation')

  const eventOrganizer = useMemo(() => {
    if (event && event.data && event.data.eventOrganizer) {
      return event.data.eventOrganizer
    }

    if (event && event.eventOrganizer) {
      return event.eventOrganizer
    }

    return ''
  }, [event])

  const { data: regionalTrainers } = useFetch(
    [],
    async () => (event?.regionId ? getRegionalTrainerOptions(String(event.regionId)) : []),
    [event?.regionId]
  )

  const { data: nationalCenterTrainers } = useFetch(
    [],
    async () => (event?.regionId ? getNationalCenterTrainerOptions(String(event.regionId)) : []),
    [event?.regionId]
  )

  // Filter out AA users for session trainers (isEvent=false)
  // AA users should only appear as Event Collaborators, not as Session Trainers
  const regionalTrainersForDisplay = useMemo(() => {
    if (isEvent) {
      return regionalTrainers
    }
    return regionalTrainers.filter((user) => {
      // only filter out users whose ONLY ROLE is AA
      if (user.roles?.length === 1) {
        return user.roles[0].name !== 'AA'
      }

      return true
    })
  }, [regionalTrainers, isEvent])

  return useMemo(() => {
    let optionsForValue = []
    let trainerOptions = []

    if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS) {
      optionsForValue = regionalTrainersForDisplay
      trainerOptions = regionalTrainersForDisplay
    }

    if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS) {
      if (facilitation === 'regional_tta_staff') {
        optionsForValue = regionalTrainersForDisplay
        trainerOptions = regionalTrainersForDisplay
      }

      if (facilitation === 'national_center' || isEvent) {
        optionsForValue = nationalCenterTrainers
        trainerOptions = nationalCenterTrainers
      }

      if (facilitation === 'both') {
        optionsForValue = [...nationalCenterTrainers, ...regionalTrainersForDisplay]
        trainerOptions = [
          {
            label: 'National Center trainers',
            options: nationalCenterTrainers,
          },
          {
            label: 'Regional trainers',
            options: regionalTrainersForDisplay,
          },
        ]
      }
    }

    return {
      trainerOptions,
      optionsForValue,
    }
  }, [eventOrganizer, facilitation, isEvent, nationalCenterTrainers, regionalTrainersForDisplay])
}
