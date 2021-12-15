/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import selectEvent from 'react-select-event';

import Grant from '../Grant';
import { withText } from '../../../../testHelpers';

describe('Grant', () => {
  const defaultRecipients = [
    {
      id: 1,
      name: 'recipient 1',
    },
    {
      id: 10,
      name: 'recipient 2',
    },
  ];

  const defaultGrant = {
    id: 1,
    number: 'abc123',
    regionId: 1,
    status: 'Active',
    startDate: '2020-12-01',
    endDate: '2020-12-02',
    recipientId: 1,
    recipient: {
      id: 1,
      name: 'recipient 1',
    },
  };

  const RenderGrant = ({
    grant = defaultGrant,
    recipients = defaultRecipients,
    onAssign = () => {},
  }) => (
    <Grant
      grant={grant}
      recipients={recipients}
      onAssignCDIGrant={onAssign}
    />
  );

  it('handles region 13', async () => {
    render(<RenderGrant grant={{ ...defaultGrant, regionId: 13 }} />);
    const regionInput = await screen.findByLabelText('Region');
    expect(regionInput).toHaveValue('0');
  });

  it('handles empty dates', async () => {
    render(<RenderGrant grant={{ ...defaultGrant, startDate: null, endDate: null }} />);
    const startDate = await screen.findByText(withText('Start Date: '));
    const endDate = await screen.findByText(withText('End Date: '));
    expect(startDate).toBeVisible();
    expect(endDate).toBeVisible();
  });

  describe('renders field', () => {
    beforeEach(() => {
      render(
        <RenderGrant />,
      );
    });

    it('number', async () => {
      const number = await screen.findByText(withText('Number: abc123 - 1'));
      expect(number).toBeVisible();
    });

    it('region', async () => {
      const region = await screen.findByText(withText('Region: 1'));
      expect(region).toBeVisible();
    });

    it('recipient', async () => {
      const recipient = await screen.findByText(withText('Recipient: recipient 1'));
      expect(recipient).toBeVisible();
    });

    it('status', async () => {
      const status = await screen.findByText(withText('Status: Active'));
      expect(status).toBeVisible();
    });

    it('start date', async () => {
      const startDate = await screen.findByText(withText('Start Date: 12/01/2020'));
      expect(startDate).toBeVisible();
    });

    it('end date', async () => {
      const endDate = await screen.findByText(withText('End Date: 12/02/2020'));
      expect(endDate).toBeVisible();
    });
  });

  describe('form interactions', () => {
    it('region is select-able', async () => {
      render(<RenderGrant />);
      const dropdown = await screen.findByLabelText('Region');
      userEvent.selectOptions(dropdown, ['2']);
      expect(dropdown).toHaveValue('2');
    });

    it('recipient is select-able', async () => {
      const onAssign = jest.fn();
      render(<RenderGrant onAssign={onAssign} />);
      const dropdown = await screen.findByLabelText('Recipient');
      await selectEvent.select(dropdown, ['recipient 2 - 10']);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      expect(onAssign).toHaveBeenCalledWith(1, 1, 10);
    });

    describe('on submit', () => {
      it('calls onAssignCDIGrant', async () => {
        const onAssign = jest.fn();
        render(<RenderGrant onAssign={onAssign} />);
        const button = await screen.findByRole('button');
        userEvent.click(button);
        expect(onAssign).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        const onAssign = jest.fn();
        onAssign.mockImplementation(() => {
          throw new Error();
        });
        render(<RenderGrant onAssign={onAssign} />);
        const button = await screen.findByRole('button');
        userEvent.click(button);
        const alert = await screen.findByTestId('alert');
        expect(alert).toHaveTextContent('Unable to assign CDI grant');
      });

      it('only submits if a region is selected', async () => {
        render(<RenderGrant grant={{ ...defaultGrant, regionId: 13 }} />);
        const button = await screen.findByRole('button');
        userEvent.click(button);
        const alert = await screen.findByTestId('alert');
        expect(alert).toHaveTextContent('A region must be selected');
      });
    });
  });
});
