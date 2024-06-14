import React from 'react';
import { SideNav } from '@trussworks/react-uswds';
import { Link, Routes, Route } from 'react-router-dom';
import Create from './Create';
import Close from './Close';

const sideNavMenuItems = [
  <Link to="/admin/goals/create">Create</Link>,
  <Link to="/admin/goals/close">Close</Link>,
];

export default function Goals() {
  return (
    <div className="ttahub-grid__container ttahub-grid__container--gap-1">
      <nav className="ttahub-grid__nav">
        <SideNav items={sideNavMenuItems} />
      </nav>
      <div className="ttahub-grid__content">
        <Routes>
          <Route
            path="create"
            element={<Create />}
          />
          <Route
            path="close"
            element={<Close />}
          />
          <Route
            path="*"
            element={(
              <div>
                <p className="usa-prose">A selection is in order</p>
              </div>
)}
          />

        </Routes>
      </div>
    </div>
  );
}
