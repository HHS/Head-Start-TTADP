/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState } from 'react';
import { getRoles, saveRoles } from '../../fetchers/Admin';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const rolesFromApi = await getRoles();
        setRoles(rolesFromApi);
      } catch (error) {
        setFetchError(true);
      }
    }

    if (!fetchError && roles.length < 1) {
      fetchRoles();
    }
  }, [fetchError, roles.length]);

  if (!roles.length) {
    return <div>Loading...</div>;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const updatedRoles = await saveRoles(roles.filter((role) => role.fullName && role.name));
    setRoles(updatedRoles);
  };

  return (
    <div>
      <h1>Roles</h1>
      <form onSubmit={onSubmit}>
        <ul className="usa-list usa-list--unstyled">
          {roles.map((role, index) => {
            const onChangeCode = (e) => {
              const newRoles = roles.map((r) => ({ ...r }));
              newRoles[index].name = e.target.value;
              setRoles(newRoles);
            };

            const onChangeName = (e) => {
              const newRoles = roles.map((r) => ({ ...r }));
              newRoles[index].fullName = e.target.value;
              setRoles(newRoles);
            };

            return (
              <li key={role.id} className="display-flex">
                <div className="margin-right-2">
                  <label className="usa-label sr-only" htmlFor={`role-code-${role.id}`}>
                    Abbreviation for
                    {' '}
                    {role.id}
                  </label>
                  <input required className="usa-input" type="text" id={`role-code-${role.id}`} onChange={onChangeCode} value={role.name} />
                </div>
                <div>
                  <label className="usa-label sr-only" htmlFor={`role-name-${role.id}`}>
                    Name for
                    {' '}
                    {role.id}
                  </label>
                  <input required className="usa-input" type="text" id={`role-name-${role.id}`} onChange={onChangeName} value={role.fullName} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="margin-top-2">
          <input className="usa-button usa-button--primary" type="submit" value="Save changes" />
        </div>
      </form>
    </div>
  );
}
