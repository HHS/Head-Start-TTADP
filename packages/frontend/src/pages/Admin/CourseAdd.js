import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Fieldset,
  Form,
  FormGroup,
  Label,
  TextInput,
} from '@trussworks/react-uswds';
import { createCourseByName } from '../../fetchers/courses';

function CourseAdd({ refresh }) {
  const [courseName, setCourseName] = useState('');

  const create = async () => {
    await createCourseByName(courseName);
    refresh();
    setCourseName('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    create();
  };

  return (
    <div>
      <h2>Add a new course</h2>
      <Form key="add-new-course-form" onSubmit={onSubmit}>
        <FormGroup>
          <Fieldset>
            <Label htmlFor="coursename">Course name</Label>
            <TextInput
              type="text"
              id="coursename"
              key="coursename"
              name="coursename"
              onChange={(e) => setCourseName(e.target.value)}
              value={courseName}
            />
          </Fieldset>
        </FormGroup>
        <Button
          type="submit"
          data-testid="add-course"
          className="margin-top-2"
        >
          Add course
        </Button>
      </Form>
    </div>
  );
}

CourseAdd.propTypes = {
  refresh: PropTypes.func.isRequired,
};

export default CourseAdd;
