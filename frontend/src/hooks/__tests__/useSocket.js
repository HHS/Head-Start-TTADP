import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSocket from '../useSocket';

describe('useSocket', () => {
  let sock;
  const SocketTest = () => {
    const input = useRef();
    const hook = useSocket({ name: 'test' });

    sock = hook.socket;

    return (
      <>
        <input type="text" name="socketPath" ref={input} />
        <button type="button" onClick={() => hook.setSocketPath(input.current.value)}>Set path</button>
        <button type="button" onClick={() => hook.clearStore()}>Clear store</button>
      </>
    );
  };

  const renderSocketTest = () => render(<SocketTest />);

  beforeAll(() => {
    global.WebSocket = class extends WebSocket {
      constructor() {
        super('wss://test');
        global.sendMsg = null;
        this.binaryType = '';
      }

      addEventListener(event, cb) {
        if (!this.binaryType) {
          return;
        }

        if (event === 'open') {
          cb();
        } else if (event === 'message') {
          global.sendMsg = cb;
        }
      }
    };

    renderSocketTest();
  });

  it('fires the use effect when socket path changes', async () => {
    // change socket path
    const textBox = await screen.findByRole('textbox');
    act(() => {
      userEvent.type(textBox, 'hello');
      userEvent.click(screen.getByRole('button', { name: 'Set path' }));
    });

    // wait for socket to be created
    await waitFor(() => expect(sock).not.toBeNull());
  });

  it('sends a message when the socket is opened', async () => {
    // check that the message was sent
    expect(global.sendMsg).not.toBeNull();
  });
});
