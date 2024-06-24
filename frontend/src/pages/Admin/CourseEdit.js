import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import {
  Button,
  ButtonGroup,
  Label,
  TextInput,
} from '@trussworks/react-uswds';
import { useNavigate } from 'react-router-dom';
import { deleteCourseById, getCourseById, updateCourseById } from '../../fetchers/courses';
import Modal from '../../components/Modal';

function CourseEdit({ match }) {
  const { params: { courseId } } = match;
  const [course, setCourse] = useState();
  const [newCourse, setNewCourse] = useState();
  const modalRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCourse() {
      const c = await getCourseById(courseId);
      setCourse({ ...c });
      setNewCourse({ ...c });
    }

    if (!course) {
      fetchCourse();
    }
  }, [course, courseId]);

  const askConfirmDelete = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.toggleModal(true);
    }
  }, []);

  if (!course || !newCourse) {
    return <div>Loading course...</div>;
  }

  const onChange = (e) => {
    setNewCourse((prevCourse) => ({ ...prevCourse, name: e.target.value }));
  };

  const saveChanges = async () => {
    const updated = await updateCourseById(courseId, { name: newCourse.name });
    setCourse({ ...updated });
    navigate(`/admin/course/${updated.id}`, { replace: true });
  };

  const confirmDelete = async () => {
    if (modalRef.current) {
      modalRef.current.toggleModal(false);
    }

    await deleteCourseById(courseId);

    navigate('/admin/courses');
  };

  return (
    <div>
      <h2>{course.name}</h2>
      <Label htmlFor={`coursename-${course.id}`}>Course Name</Label>
      <TextInput
        type="text"
        id={`coursename-${course.id}`}
        key={`coursename-${course.id}`}
        name="coursename"
        value={newCourse.name}
        placeholder={course.name}
        onChange={onChange}
      />

      <ButtonGroup type="default" style={{ marginTop: '8px' }}>
        <Button onClick={saveChanges}>Save changes</Button>
        <Button id="delete-course-button" onClick={askConfirmDelete} secondary>Delete course</Button>
      </ButtonGroup>

      <Modal
        modalRef={modalRef}
        onOk={confirmDelete}
        modalId="DeleteCourseModal"
        title="Are you sure you want to delete this course?"
        okButtonText="Yes, delete it"
        okButtonAriaLabel="Delete course"
        okButtonCss="usa-button--secondary"
        cancelButtonCss="usa-button--unstyled"
      >
        This action cannot be undone.
      </Modal>
    </div>
  );
}

CourseEdit.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default CourseEdit;
