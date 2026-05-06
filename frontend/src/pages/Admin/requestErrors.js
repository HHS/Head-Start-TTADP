/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  Datagrid,
  DateField,
  List,
  ListButton,
  Show,
  SimpleShowLayout,
  TextField,
  TopToolbar,
} from 'react-admin';

// eslint-disable-next-line react/prop-types
const RequestErrorShowActions = ({ basePath }) => (
  <TopToolbar>
    <ListButton basePath={basePath} />
  </TopToolbar>
);

const ScrollDatagrid = (props) => (
  <div className="smart-hub-admin-diag__table-scroll">
    <Datagrid {...props} />
  </div>
);

const RequestErrorList = (props) => (
  <List {...props} className="smart-hub--overflow-auto" component="div" syncWithLocation={false}>
    <ScrollDatagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="operation" />
      <TextField source="uri" />
      <TextField source="method" />
      <TextField source="responseCode" />
      <DateField source="createdAt" />
      <DateField source="updatedAt" />
    </ScrollDatagrid>
  </List>
);

export const RequestErrorShow = (props) => (
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

export default RequestErrorList;
