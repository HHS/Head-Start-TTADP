import React from 'react'
import PropTypes from 'prop-types'
import { TextInput } from '@trussworks/react-uswds'
import FormItem from './FormItem'

export default function ParticipantsNumberOfParticipants({ register, isHybrid, isDeliveryMethodSelected }) {
  if (!isDeliveryMethodSelected) {
    return null
  }

  return (
    <div>
      {isHybrid ? (
        <>
          <div>
            <FormItem label="Number of participants attending in person " name="numberOfParticipantsInPerson" required>
              <div className="maxw-card-lg">
                <TextInput
                  id="numberOfParticipantsInPerson"
                  name="numberOfParticipantsInPerson"
                  type="number"
                  min={1}
                  required
                  inputRef={register({
                    required: 'Enter number of participants attending in person',
                    valueAsNumber: true,
                    min: {
                      value: 1,
                      message: 'Number of participants can not be zero or negative',
                    },
                  })}
                />
              </div>
            </FormItem>
          </div>
          <div>
            <FormItem label="Number of participants attending virtually " name="numberOfParticipantsVirtually" required>
              <div className="maxw-card-lg">
                <TextInput
                  required
                  id="numberOfParticipantsVirtually"
                  name="numberOfParticipantsVirtually"
                  type="number"
                  min={1}
                  inputRef={register({
                    required: 'Enter number of participants attending virtually',
                    valueAsNumber: true,
                    min: {
                      value: 1,
                      message: 'Number of participants can not be zero or negative',
                    },
                  })}
                />
              </div>
            </FormItem>
          </div>
        </>
      ) : (
        <div>
          <FormItem label="Number of participants " name="numberOfParticipants">
            <div className="maxw-card-lg">
              <TextInput
                required
                id="numberOfParticipants"
                name="numberOfParticipants"
                type="number"
                min={1}
                inputRef={register({
                  required: 'Enter number of participants',
                  valueAsNumber: true,
                  min: {
                    value: 1,
                    message: 'Number of participants can not be zero or negative',
                  },
                })}
              />
            </div>
          </FormItem>
        </div>
      )}
    </div>
  )
}

ParticipantsNumberOfParticipants.propTypes = {
  register: PropTypes.func.isRequired,
  isHybrid: PropTypes.bool.isRequired,
  isDeliveryMethodSelected: PropTypes.bool.isRequired,
}
