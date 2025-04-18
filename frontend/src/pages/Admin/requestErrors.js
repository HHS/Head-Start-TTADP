/* eslint-disable react/jsx-props-no-spreading */
import React, { useEffect, useState } from 'react';

// eslint-disable-next-line react/prop-types
const RequestErrorShowActions = ({ basePath }) => {
  const [TopToolbar, setTopToolbar] = useState(null);
  const [ListButton, setListButton] = useState(null);

  useEffect(() => {
    const importRA = async () => {
      const RA = await import('react-admin');
      setTopToolbar(() => RA.TopToolbar);
      setListButton(() => RA.ListButton);
    };

    importRA();
  }, []);

  if (!TopToolbar || !ListButton) return <div>Page is Loading...</div>;

  return (
    <TopToolbar>
      <ListButton basePath={basePath} />
    </TopToolbar>
  );
};

const RequestErrorList = (props) => {
  const [List, setList] = useState(null);
  const [Datagrid, setDatagrid] = useState(null);
  const [TextField, setTextField] = useState(null);
  const [DateField, setDateField] = useState(null);

  useEffect(() => {
    const importRA = async () => {
      const RA = await import('react-admin');
      setList(() => RA.List);
      setDatagrid(() => RA.Datagrid);
      setTextField(() => RA.TextField);
      setDateField(() => RA.DateField);
    };

    importRA();
  }, []);

  if (!List || !Datagrid || !TextField || !DateField) return <div>Page is Loading...</div>;

  return (
    <List {...props} className="smart-hub--overflow-auto">
      <Datagrid rowClick="edit">
        <TextField source="id" />
        <TextField source="operation" />
        <TextField source="uri" />
        <TextField source="method" />
        <TextField source="responseCode" />
        <DateField source="createdAt" />
        <DateField source="updatedAt" />
      </Datagrid>
    </List>
  );
};

export const RequestErrorShow = (props) => {
  const [Show, setShow] = useState(null);
  const [SimpleShowLayout, setSimpleShowLayout] = useState(null);
  const [TextField, setTextField] = useState(null);
  const [DateField, setDateField] = useState(null);

  useEffect(() => {
    const importRA = async () => {
      const RA = await import('react-admin');
      setShow(() => RA.Show);
      setSimpleShowLayout(() => RA.SimpleShowLayout);
      setTextField(() => RA.TextField);
      setDateField(() => RA.DateField);
    };

    importRA();
  }, []);

  if (!Show || !SimpleShowLayout || !TextField || !DateField) return <div>Page is Loading...</div>;

  return (
    <Show actions={<RequestErrorShowActions />} {...props}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="operation" />
        <TextField source="uri" />
        <TextField source="method" />
        <TextField source="requestBody" />
        <TextField source="responseBody" />
        <TextField source="responseCode" />
        <DateField source="createdAt" />
        <DateField source="updatedAt" />
      </SimpleShowLayout>
    </Show>
  );
};

export default RequestErrorList;
