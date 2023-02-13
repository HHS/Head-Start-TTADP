/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Button, TextInput } from '@trussworks/react-uswds';
import colors from '../../colors';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import Req from '../../components/Req';
import Select from '../../components/Select';
import UserContext from '../../UserContext';

export default function MyGroups() {
  const { user } = useContext(UserContext);

  useEffect(() => {
    // load data from API based on query param
  }, []);

  useEffect(() => {
    // get grants/recipients for user
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    // get data from form
    // const data = new FormData(e.target);
    // const name = data.get('new-group-name');
    
    // format recipients ?

    // create group via POST

    // handle success

    // handle error
  };

  return (
    <>
      <Helmet>
        <title>My groups</title>
      </Helmet>
      <Link className="margin-top-2 margin-bottom-3 display-inline-block" to="/account">
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
        Back to Account Management
      </Link>
      <h1 className="landing">My groups</h1>

      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h2 className="margin-bottom-2">Create a group</h2>
        <IndicatesRequiredField />
        <form onSubmit={onSubmit}>
          <label htmlFor="new-group-name">
            Group name
            {' '}
            <Req />
          </label>
          <TextInput id="new-group-name" name="new-group-name" required />

          <label htmlFor="select-recipients-new-group">
            Recipients
            {' '}
            <Req />
          </label>
          <Select id="select-recipients-new-group" name="select-recipients-new-group" />

          <Button type="submit" className="margin-top-2">Save group</Button>
          <Button type="button" outline className="margin-top-2 margin-left-1">Cancel</Button>
        </form>
      </div>

    </>
  );
}
