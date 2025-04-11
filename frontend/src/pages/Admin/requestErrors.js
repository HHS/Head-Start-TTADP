/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';

let List = null;
let Datagrid = null;
let TextField = null;
let DateField = null;
let Show = null;
let SimpleShowLayout = null;
let TopToolbar = null;
let ListButton = null;

import('react-admin').then((RA) => {
  List = RA.List;
  Datagrid = RA.Datagrid;
  TextField = RA.TextField;
  DateField = RA.DateField;
  Show = RA.Show;
  SimpleShowLayout = RA.SimpleShowLayout;
  TopToolbar = RA.TopToolbar;
  ListButton = RA.ListButton;
});

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
