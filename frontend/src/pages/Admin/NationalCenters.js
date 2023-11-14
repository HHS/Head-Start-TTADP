import React, { useEffect, useState, useRef } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Link, useHistory } from 'react-router-dom';
import {
  Alert,
  Button, Form, Label, ModalToggleButton, TextInput,
} from '@trussworks/react-uswds';
import Modal from '../../components/VanillaModal';
import { getNationalCenters } from '../../fetchers/nationalCenters';
import {
  createNationalCenter,
  deleteNationalCenter,
  updateNationalCenter,
} from '../../fetchers/Admin';
import './NationalCenters.scss';

export default function NationalCenters({ match }) {
  const { params: { nationalCenterId } } = match;
  const history = useHistory();
  const modalRef = useRef();
  const [nationalCenters, setNationalCenters] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    async function fetchNationalCenters() {
      setError(null);
      try {
        // eslint-disable-next-line no-unused-vars
        const { centers, users } = await getNationalCenters();
        setNationalCenters(centers);
      } catch (e) {
        setError('Error fetching national centers');
        setNationalCenters([]);
      }
    }
    if (!nationalCenters) {
      fetchNationalCenters();
    }
  }, [nationalCenters]);

  if (!nationalCenters) {
    return 'Loading...';
  }

  let selectedCenter = null;

  if (nationalCenterId && nationalCenterId !== 'new') {
    selectedCenter = nationalCenters.find((c) => (
      c.id === nationalCenterId
    ));
  }

  if (nationalCenterId === 'new') {
    selectedCenter = {
      id: 'new',
      name: '',
    };
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const { id, ...data } = Object.fromEntries(formData.entries());

      if (id === 'new') {
        const c = await createNationalCenter(data);
        // update our location
        history.replace(`/admin/national-centers/${c.id}`, { message: 'Center created successfully' });
      } else {
        const c = await updateNationalCenter(id, data);
        // update our location
        history.replace(`/admin/national-centers/${c.id}`, { message: 'Center updated successfully' });
      }

      // trigger re-fetch
      setNationalCenters(null);
    } catch (err) {
      setError('Error saving national center');
    }
  };

  const onDelete = async (selection) => {
    try {
      await deleteNationalCenter(selection.id);
      history.replace('/admin/national-centers/', { message: 'Center deleted successfully' });
      // trigger re-fetch
      setNationalCenters(null);
    } catch (err) {
      setError('Error deleting national center');
    }
  };

  const message = history.location.state && history.location.state.message;

  const getCenterToDisplay = (center) => {
    let centerToDisplay = center.name;
    if (center.users && center.users.length > 0) {
      centerToDisplay = `${center.name} (${center.users[0].name})`;
    }
    return centerToDisplay;
  };

  return (
    <div>
      <Modal
        modalRef={modalRef}
        heading="Are you sure you want to delete this national center?"
      >
        <p>Any information you entered will be lost.</p>
        <ModalToggleButton closer modalRef={modalRef} data-focus="true" className="margin-right-1">Cancel</ModalToggleButton>
        <Button
          type="button"
          unstyled
          onClick={() => {
            onDelete(selectedCenter);
          }}
        >
          Yes
        </Button>
      </Modal>
      <div className="ttahub-national-centers-grid">
        <nav className="ttahub-national-centers-grid__nav">
          <ul className="usa-list padding-x-6">
            {nationalCenters.map((center) => (
              <li key={center.id}>
                <Link to={`/admin/national-centers/${center.id}`}>
                  {getCenterToDisplay(center)}
                </Link>
              </li>
            ))}
            <hr />
            <li>
              <Link to="/admin/national-centers/new">
                Add new national center
              </Link>
            </li>
          </ul>
        </nav>

        <div className="ttahub-national-centers-grid__content">
          <h2>National Centers</h2>
          {(message && !error) && (
            <Alert type="success" className="margin-bottom-4 maxw-mobile-lg" noIcon>
              {message}
            </Alert>
          )}
          {error && (
            <Alert type="error" className="margin-bottom-4 maxw-mobile-lg" noIcon>
              {error}
            </Alert>
          )}
          {selectedCenter && (
          <Form onSubmit={onSubmit}>
            <Label htmlFor="name">National center name</Label>
            <TextInput key={`name-for-${selectedCenter.id}`} defaultValue={selectedCenter.name} name="name" id="name" required />

            <input type="hidden" required name="id" value={selectedCenter.id} />

            <div className="display-flex">
              <Button type="submit">Save</Button>
              { selectedCenter.id !== 'new' ? <ModalToggleButton modalRef={modalRef} secondary>Delete</ModalToggleButton> : null }
            </div>

          </Form>
          )}
        </div>
      </div>

    </div>
  );
}

NationalCenters.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
