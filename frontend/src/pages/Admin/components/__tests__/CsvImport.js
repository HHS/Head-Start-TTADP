import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import CsvImport from '../CsvImport';

const testCsvUrl = join('/', 'api', 'admin', 'test-csv');

// eslint-disable-next-line quotes
const goodTestCSVFile = "Primary ID,Edit Title,IST Name:,Creator,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\nevent test 1,title test 1,ist test 1,creator test 1,event test 1,nc test 1,dur test 1,reason test 1,tp test 1,Audience test 1,vision test 1\r\nevent test 2,title test 2,ist test 2,creator test 2,event test 2,nc test 2,dur test 2,reason test 2,tp test 2,Audience test 2,vision test 2\r\n";
// eslint-disable-next-line quotes
const duplicateTestCSVFile = "Primary ID,Edit Title,IST Name:,Creator,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\nevent test,title test,ist test,creator test,event test,nc test,dur test,reason test,tp test,Audience test,vision test\r\nevent test,title test,ist test,creator test,event test,nc test,dur test,reason test,tp test,Audience test,vision test\r\n";
// eslint-disable-next-line quotes
const missingCoumnsTestCSVFile = "Primary ID Missing,Edit Title Missing,IST Name:,Creator Missing,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\nevent test,title test,ist test,creator test,event test,nc test,dur test,reason test,tp test,Audience test,vision test\r\n";
// eslint-disable-next-line quotes
const invalidColumnTestCsvFile = "Invalid Column,Primary ID,Edit Title,IST Name:,Creator,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\ninvalid value,event test 1,title test 1,ist test 1,creator test 1,event test 1,nc test 1,dur test 1,reason test 1,tp test 1,Audience test 1,vision test 1\r\ninvalid value 2,event test 2,title test 2,ist test 2,creator test 2,event test 2,nc test 2,dur test 2,reason test 2,tp test 2,Audience test 2,vision test 2\r\n";

describe('CsvImport', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('displays the component', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={[]}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert Displays text 'test csv import'
    const csvHeader = await screen.findByRole('heading', { name: /test csv import/i });
    expect(csvHeader).toBeVisible();

    // Assert text 'Input accepts a single file'.
    const inputAccepts = await screen.findByText(/Input accepts a single file/i);
    expect(inputAccepts).toBeVisible();

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Assert button 'Upload csv reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays csv required error', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={[]}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'CSV_Test_Invalid_File_Type.csv' into a file object.
    const file = new File(['bad csv'], 'CSV_Test_Invalid_File_Type.txt', { type: 'text/plain' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/Please upload a CSV file./i);
    expect(error).toBeVisible();

    // Assert button 'Upload csv reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays duplicate event id error', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={[]}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'CSV_Test_Invalid_File_Type.csv' into a file object.
    const file = new File([duplicateTestCSVFile], 'CSV_Test_Invalid_File_Type.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/duplicate primary ids found\. please correct and try again\. duplicates: event test/i);
    expect(error).toBeVisible();

    // Assert button 'Upload csv reports' is visible.f
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays missing columns error', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([missingCoumnsTestCSVFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/Required headers missing: Primary ID, Edit Title, Creator/i);
    expect(error).toBeVisible();

    // Assert button 'Upload test csv' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays invalid columns', async () => {
    const history = createMemoryHistory();

    const validColumns = [
      'Primary ID',
      'Edit Title',
      'IST Name:',
      'Creator',
      'Event Organizer - Type of Event',
      'National Center(s) Requested',
      'Event Duration/# NC Days of Support',
      'Reason for Activity',
      'Target Population(s)',
      'Audience',
      'Overall Vision/Goal for the PD Event',
    ];
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={validColumns}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([invalidColumnTestCsvFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/Invalid headers found: Invalid Column/i);
    expect(error).toBeVisible();

    // Assert button 'Upload test csv' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();
  });

  it('ignores invalid columns', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([invalidColumnTestCsvFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    expect(screen.queryAllByText(/Invalid headers found: Invalid Column/i).length).toBe(0);

    // Assert button 'Upload test csv' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays good import csv', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTestCSVFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const error = await screen.findByText(/2 test csv will be imported./i);
    expect(error).toBeVisible();

    // Assert button 'Upload test csv' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();

    // Mock fetch response for url 'testCsvUrl'.
    fetchMock.post(testCsvUrl, {
      status: 200,
      body: {
        success: true,
        count: 2,
        skipped: ['event id 1', 'event id 2'],
        errors: ['event id 2', 'event id 3'],
      },
    });

    // Click button 'Upload test csv'.
    userEvent.click(uploadButton);

    // Assert to see correct import count.
    const success = await screen.findByText(/2 test csv imported successfully./i);
    expect(success).toBeVisible();

    // assert to see the text '2 skipped' and then check each skipped event in its own <li> element
    const skippedHeader = await screen.findByText(/2 skipped/i);
    expect(skippedHeader).toBeVisible();
    const eventId1 = within(skippedHeader).getByText(/event id 1/i);
    expect(eventId1).toBeInTheDocument();
    const eventId2 = within(skippedHeader).getByText(/event id 2/i);
    expect(eventId2).toBeInTheDocument();

    // assert to see the text '2 errors: event id 2, event id 3'.
    const errorsHeader = await screen.findByText(/2 errors/i);
    expect(errorsHeader).toBeVisible();
    const errorEventId2 = within(errorsHeader).getByText(/event id 2/i);
    expect(errorEventId2).toBeInTheDocument();
    const errorEventId3 = within(errorsHeader).getByText(/event id 3/i);
    expect(errorEventId3).toBeInTheDocument();

    expect(uploadButton).toBeVisible();

    // Assert the text '2 events will be imported.' is no longer displayed.
    const info = screen.queryAllByText(/2 tests csvs will be imported./i);
    expect(info.length).toBe(0);
  });

  it('displays optional summary results', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTestCSVFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const error = await screen.findByText(/2 test csv will be imported./i);
    expect(error).toBeVisible();

    // Assert button 'Upload test csv' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();

    // Mock fetch response for url 'testCsvUrl'.
    fetchMock.post(testCsvUrl, {
      status: 200,
      body: {
        success: true,
        count: 2,
        skipped: ['event id 1', 'event id 2'],
        errors: ['event id 2', 'event id 3'],
        updated: [{ name: 'updated course 1' }, { name: 'updated course 2' }],
        created: [{ name: 'created course 1' }, { name: 'created course 2' }],
        replaced: [{ name: 'replaced course 1' }, { name: 'replaced course 2' }],
        deleted: [{ name: 'deleted course 1' }, { name: 'deleted course 2' }],
      },
    });

    // Click button 'Upload test csv'.
    userEvent.click(uploadButton);

    // Assert to see correct import count.
    const success = await screen.findByText(/2 test csv imported successfully./i);
    expect(success).toBeVisible();

    // assert to see the text '2 crated' and then check each skipped event in its own <li> element
    const crate3dHeader = await screen.findByText(/2 created/i);
    expect(crate3dHeader).toBeVisible();
    const createdEvent1 = within(crate3dHeader).getByText(/created course 1/i);
    expect(createdEvent1).toBeInTheDocument();
    const createdEvent2 = within(crate3dHeader).getByText(/created course 2/i);
    expect(createdEvent2).toBeInTheDocument();

    // assert to see the text '2 skipped' and then check each skipped event in its own <li> element
    const skippedHeader = await screen.findByText(/2 skipped/i);
    expect(skippedHeader).toBeVisible();
    const eventId1 = within(skippedHeader).getByText(/event id 1/i);
    expect(eventId1).toBeInTheDocument();
    const eventId2 = within(skippedHeader).getByText(/event id 2/i);
    expect(eventId2).toBeInTheDocument();

    // assert to see the text '2 errors: event id 2, event id 3'.
    const errorsHeader = await screen.findByText(/2 errors/i);
    expect(errorsHeader).toBeVisible();
    const errorEventId2 = within(errorsHeader).getByText(/event id 2/i);
    expect(errorEventId2).toBeInTheDocument();
    const errorEventId3 = within(errorsHeader).getByText(/event id 3/i);
    expect(errorEventId3).toBeInTheDocument();

    // assert to see the text '2 updated'.
    const updatedHeader = await screen.findByText(/2 updated/i);
    expect(updatedHeader).toBeVisible();
    const updatedCourseId1 = within(updatedHeader).getByText(/updated course 1/i);
    expect(updatedCourseId1).toBeInTheDocument();
    const updatedCourseId2 = within(updatedHeader).getByText(/updated course 2/i);
    expect(updatedCourseId2).toBeInTheDocument();

    // assert to see the text '2 replaced'.
    const replacedHeader = await screen.findByText(/2 replaced/i);
    expect(replacedHeader).toBeVisible();
    const replacedCourseId1 = within(replacedHeader).getByText(/replaced course 1/i);
    expect(replacedCourseId1).toBeInTheDocument();
    const replacedCourseId2 = within(replacedHeader).getByText(/replaced course 2/i);
    expect(replacedCourseId2).toBeInTheDocument();

    // assert to see the text '2 deleted'.
    const deletedHeader = await screen.findByText(/2 deleted/i);
    expect(deletedHeader).toBeVisible();
    const deletedCourseId1 = within(deletedHeader).getByText(/deleted course 1/i);
    expect(deletedCourseId1).toBeInTheDocument();
    const deletedCourseId2 = within(deletedHeader).getByText(/deleted course 2/i);
    expect(deletedCourseId2).toBeInTheDocument();
  });

  it('displays bad import csv', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTestCSVFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const error = await screen.findByText(/2 test csv will be imported./i);
    expect(error).toBeVisible();

    // Assert button 'Uploadt test csv' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    expect(uploadButton).toBeVisible();

    // Mock fetch error response for url 'test csv'.
    fetchMock.post(testCsvUrl, { status: 500, body: { success: false, count: 0 } });

    // Click button 'Upload test csv'.
    userEvent.click(uploadButton);

    // Assert to see correct import count.
    const errorResponse = await screen.findByText(/Error attempting to import test csv./i);
    expect(errorResponse).toBeVisible();
  });

  it('displays error if no import file is selected', async () => {
    // Render.
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CsvImport
          validCsvHeaders={[]}
          requiredCsvHeaders={['Primary ID', 'Edit Title', 'Creator']}
          typeName="Test CSV"
          apiPathName="test-csv"
          primaryIdColumn="Primary ID"
        />
      </Router>,
    );

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Click the button 'Upload test csv'.
    const uploadButton = await screen.findByRole('button', { name: /Upload test csv/i });
    userEvent.click(uploadButton);

    // Verify error message is displayed.
    let error = await screen.findByText(/Please select a file to import./i);
    expect(error).toBeVisible();

    // Load 'Test_CSV_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTestCSVFile], 'Test_CSV_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const info = await screen.findByText(/2 test csv will be imported./i);
    expect(info).toBeVisible();

    // Assert error message is no longer visible.
    error = screen.queryAllByText(/Please select a file to import./i);
    expect(error.length).toBe(0);
  });
});
