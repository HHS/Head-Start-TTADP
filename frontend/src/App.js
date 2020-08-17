import React from 'react';
import 'uswds/dist/css/uswds.min.css';
import 'uswds/dist/js/uswds';

import Alert from './components/Alert';

function App() {
  return (
    <>
      <Alert
        heading="Hello"
        body="World!"
      />
    </>
  );
}

export default App;
