import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Label, Fieldset, Radio } from '@trussworks/react-uswds'
import Select from 'react-select'
import selectOptionsReset from './selectOptionsReset'
import Req from './Req'
import { getCourses } from '../fetchers/courses'

export default function ObjectiveCourseSelect({
  error,
  inputName,
  onBlur,
  onChange,
  value,
  isLoading,
  onChangeUseIpdCourses,
  onBlurUseIpdCourses,
  useIpdCourse,
  useCoursesInputName,
  className,
}) {
  const [options, setOptions] = useState([])

  useEffect(() => {
    async function fetchCourses() {
      try {
        setOptions(await getCourses())
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Error fetching courses from the API', e)
      }
    }

    fetchCourses()
  }, [])

  return (
    <div className={`ttahub-ipd-course-select--container ${className}`}>
      <Fieldset>
        <legend>
          Did you use an iPD course as a resource? <Req />
        </legend>
        <Radio
          label="Yes"
          id={`${useCoursesInputName}-yes`}
          name={useCoursesInputName}
          onChange={() => onChangeUseIpdCourses(true)}
          checked={useIpdCourse === true}
          onBlur={onBlurUseIpdCourses}
        />
        <Radio
          label="No"
          id={`${useCoursesInputName}-no`}
          name={useCoursesInputName}
          onChange={() => {
            onChangeUseIpdCourses(false)
            onChange([])
          }}
          checked={useIpdCourse === false}
          onBlur={onBlurUseIpdCourses}
        />
      </Fieldset>

      <FormGroup error={error.props.children} className="ttahub-ipd-course-select--dropdown">
        <div hidden={!useIpdCourse}>
          <div className="display-flex">
            <Label htmlFor={inputName}>
              <>
                iPD course name <Req />
              </>
            </Label>
          </div>
          {error}
          <Select
            inputName={inputName}
            inputId={inputName}
            name={inputName}
            styles={selectOptionsReset}
            components={{
              DropdownIndicator: null,
            }}
            className="usa-select"
            isMulti
            options={options}
            onBlur={onBlur}
            value={value}
            onChange={onChange}
            closeMenuOnSelect={false}
            isDisabled={isLoading}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.id}
            required
          />
        </div>
      </FormGroup>
    </div>
  )
}

ObjectiveCourseSelect.propTypes = {
  error: PropTypes.node,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })
  ).isRequired,
  onChangeUseIpdCourses: PropTypes.func.isRequired,
  onBlurUseIpdCourses: PropTypes.func.isRequired,
  useIpdCourse: PropTypes.bool,
  useCoursesInputName: PropTypes.string,
  className: PropTypes.string,
}

ObjectiveCourseSelect.defaultProps = {
  error: null,
  useCoursesInputName: 'useIpdCourse',
  useIpdCourse: null,
  inputName: 'ipdCourseSelect',
  isLoading: false,
  className: '',
}
