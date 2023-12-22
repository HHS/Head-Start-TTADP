import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import TrainingReports from '../TrainingReports';

const trainingReportsUrl = join('/', 'api', 'admin', 'training-reports');

// eslint-disable-next-line quotes
const goodTrainingReportsCsv = "Sheet Name,Event ID,Edit Title,IST Name:,Creator,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\nSheet Test 1,event test 1,title test 1,ist test 1,creator test 1,event test 1,nc test 1,dur test 1,reason test 1,tp test 1,Audience test 1,vision test 1\r\nSheet Test 2,event test 2,title test 2,ist test 2,creator test 2,event test 2,nc test 2,dur test 2,reason test 2,tp test 2,Audience test 2,vision test 2\r\n";
// eslint-disable-next-line quotes
const duplicateEventIdsCsv = "Sheet Name,Event ID,Edit Title,IST Name:,Creator,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\nSheet Test,event test,title test,ist test,creator test,event test,nc test,dur test,reason test,tp test,Audience test,vision test\r\nSheet Test,event test,title test,ist test,creator test,event test,nc test,dur test,reason test,tp test,Audience test,vision test\r\n";
// eslint-disable-next-line quotes
const missingColumnsCsv = "Sheet Name,Event ID Missing,Edit Title Missing,IST Name:,Creator Missing,Event Organizer - Type of Event,National Center(s) Requested,Event Duration/# NC Days of Support,Reason for Activity,Target Population(s),Audience,Overall Vision/Goal for the PD Event\r\nSheet Test,event test,title test,ist test,creator test,event test,nc test,dur test,reason test,tp test,Audience test,vision test\r\n";

describe('Training Reports page', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('displays the training reports page', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert Displays text 'Training Report Import'
    const trainingReports = await screen.findByRole('heading', { name: /training reports import/i });
    expect(trainingReports).toBeVisible();

    // Assert text 'Input accepts a single file'.
    const inputAccepts = await screen.findByText(/Input accepts a single file/i);
    expect(inputAccepts).toBeVisible();

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays csv required error', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'TrainingReports_Duplicate_EventIds.csv' into a file object.
    const file = new File(['bad csv'], 'TrainingReports_Invalid_File_Type.txt', { type: 'text/plain' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/Please upload a CSV file./i);
    expect(error).toBeVisible();

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays duplicate event id error', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'TrainingReports_Duplicate_EventIds.csv' into a file object.
    const file = new File([duplicateEventIdsCsv], 'TrainingReports_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/Duplicate Event ID's found. Please correct and try again./i);
    expect(error).toBeVisible();

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays missing columns error', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'TrainingReports_Duplicate_EventIds.csv' into a file object.
    const file = new File([missingColumnsCsv], 'TrainingReports_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see if error message 'Duplicate Event IDs found. Please correct and try again.'.
    const error = await screen.findByText(/Required headers missing: Event ID, Edit Title, Creator/i);
    expect(error).toBeVisible();

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    expect(uploadButton).toBeVisible();
  });

  it('displays good import csv', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'TrainingReports_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTrainingReportsCsv], 'TrainingReports_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const error = await screen.findByText(/2 training reports will be imported./i);
    expect(error).toBeVisible();

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    expect(uploadButton).toBeVisible();

    // Mock fetch response for url 'trainingReportsUrl'.
    fetchMock.post(trainingReportsUrl, {
      status: 200,
      body: {
        success: true,
        count: 2,
        skipped: ['event id 1', 'event id 2'],
        errors: ['event id 2', 'event id 3'],
      },
    });

    // Click button 'Upload training reports'.
    userEvent.click(uploadButton);

    // Assert to see correct import count.
    const success = await screen.findByText(/2 training reports imported successfully./i);
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
    const info = screen.queryAllByText(/2 training reports will be imported./i);
    expect(info.length).toBe(0);
  });

  it('displays bad import csv', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Load 'TrainingReports_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTrainingReportsCsv], 'TrainingReports_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const error = await screen.findByText(/2 training reports will be imported./i);
    expect(error).toBeVisible();

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    expect(uploadButton).toBeVisible();

    // Mock fetch error response for url 'trainingReportsUrl'.
    fetchMock.post(trainingReportsUrl, { status: 500, body: { success: false, count: 0 } });

    // Click button 'Upload training reports'.
    userEvent.click(uploadButton);

    // Assert to see correct import count.
    const errorResponse = await screen.findByText(/Error attempting to import training reports./i);
    expect(errorResponse).toBeVisible();
  });

  it('displays error if no import file is selected', async () => {
    // Render.
    const history = createMemoryHistory();
    render(<Router history={history}><TrainingReports /></Router>);

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input');
    expect(fileInput).toBeVisible();

    // Click the button 'Upload training reports'.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i });
    userEvent.click(uploadButton);

    // Verify error message is displayed.
    let error = await screen.findByText(/Please select a file to import./i);
    expect(error).toBeVisible();

    // Load 'TrainingReports_Duplicate_EventIds.csv' into a file object.
    const file = new File([goodTrainingReportsCsv], 'TrainingReports_Duplicate_EventIds.csv', { type: 'text/csv' });
    userEvent.upload(fileInput, file);

    // Assert to see correct import count.
    const info = await screen.findByText(/2 training reports will be imported./i);
    expect(info).toBeVisible();

    // Assert error message is no longer visible.
    error = screen.queryAllByText(/Please select a file to import./i);
    expect(error.length).toBe(0);
  });
});
