/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  ListButton,
} from 'react-admin';

// eslint-disable-next-line react/prop-types
const RequestErrorShowActions = ({ basePath }) => (
  <TopToolbar>
    <ListButton basePath={basePath} />
  </TopToolbar>
);

const RequestErrorList = (props) => (
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
