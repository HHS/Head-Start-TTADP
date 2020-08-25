import React from 'react';
import '@trussworks/react-uswds/lib/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import {
  BrowserRouter, Switch, Route,
} from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';

import Header from './components/Header';

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
        <Route path="/second">
          <div>
            Hello second Page!
          </div>
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
