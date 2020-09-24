import React from 'react';
import '@trussworks/react-uswds/lib/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import {
  BrowserRouter, Switch, Route,
} from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';

import Header from './components/Header';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Switch>
        <Route exact path="/">
          <Alert
            type="info"
            heading="Hello"
          >
            World!
          </Alert>
        </Route>
        <Route path="/admin/:userId?" component={Admin} />
      </Switch>
    </BrowserRouter>
  );
}

export default App;
