import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Label, TextInput } from '@trussworks/react-uswds';

function CourseList({ courses }) {
  const [filter, setFilter] = useState('');

  if (!courses) {
    return null;
  }

  const onFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const filteredCourses = courses.filter(
    (course) => course.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <Label htmlFor="courses-filter">
        Filter courses by name
      </Label>
      <TextInput
        type="text"
        id="courses-filter"
        name="courses-filter"
        key="courses-filter"
        value={filter}
        onChange={onFilterChange}
        className="margin-bottom-2"
      />
      {filteredCourses.map((course) => (
        <div key={course.id} className="margin-bottom-1">
          <a href={`/admin/course/${course.id}`}>{course.name}</a>
        </div>
      ))}
    </div>
  );
}

CourseList.propTypes = {
  courses: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.number,
  })).isRequired,
};

export default CourseList;
