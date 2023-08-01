import React, { useState } from 'react';
import {
  Alert,
  Button, Form, Label, TextInput,
} from '@trussworks/react-uswds';
import Container from '../../components/Container';
import {
  sendEmail,
} from '../../fetchers/Admin';

function Email() {
  const [error, setError] = useState();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const plainFormData = Object.fromEntries(formData.entries());

      await sendEmail(plainFormData);
    } catch (err) {
      setError('Error attempting to send email');
    }
  };

  return (
    <>
      <Container paddingX={1} paddingY={1} className="smart-hub--overflow-auto">
        <div>
          <h2>Email Test</h2>
          {error && (
            <Alert type="error" className="margin-bottom-4 maxw-mobile-lg" noIcon>
              {error}
            </Alert>
          )}
          <Form onSubmit={onSubmit}>
            <Label htmlFor="to">To</Label>
            <TextInput key="email-to" name="to" id="to" required />
            <Label htmlFor="subject">Subject</Label>
            <TextInput key="email-subject" name="subject" id="subject" required />
            <Label htmlFor="message">Message</Label>
            <TextInput key="email-message" name="message" id="message" />

            <div className="display-flex">
              <Button type="submit">Send test email</Button>
            </div>

          </Form>
        </div>
      </Container>
    </>
  );
}
export default Email;
