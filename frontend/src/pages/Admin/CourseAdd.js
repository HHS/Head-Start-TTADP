import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Label, TextInput } from '@trussworks/react-uswds';
import { createCourseByName } from '../../fetchers/courses';

function CourseAdd({ refresh }) {
  const [courseName, setCourseName] = useState('');

  const create = async () => {
    await createCourseByName(courseName);
    refresh();
    setCourseName('');
  };

  return (
    <div>
      <h2>Add a new course</h2>
      <Label htmlFor="coursename">
        Course name
      </Label>
      <TextInput
        type="text"
        id="coursename"
        key="coursename"
        name="coursename"
        onChange={(e) => setCourseName(e.target.value)}
        value={courseName}
      />
      <Button
        type="button"
        data-testid="add-course"
        onClick={create}
        className="margin-top-2"
      >
        Add course
      </Button>
    </div>
  );
}

CourseAdd.propTypes = {
  refresh: PropTypes.func.isRequired,
};

export default CourseAdd;
