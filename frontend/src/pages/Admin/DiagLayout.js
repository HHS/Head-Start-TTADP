/* eslint-disable react/jsx-props-no-spreading */

import PropTypes from 'prop-types';
import React from 'react';
import { Layout } from 'react-admin';

const DIAG_SIDEBAR_WIDTH = 268;

const diagTheme = {
  sidebar: {
    width: DIAG_SIDEBAR_WIDTH,
  },
  overrides: {
    RaLayout: {
      root: {
        minWidth: 0,
        minHeight: '100vh',
      },
      contentWithSidebar: {
        alignItems: 'stretch',
        minWidth: 0,
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      },
      content: {
        minWidth: 0,
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #dfe1e2',
      },
    },
    RaList: {
      root: {
        minWidth: 0,
        maxWidth: '100%',
      },
      main: {
        minWidth: 0,
        maxWidth: '100%',
      },
      content: {
        minWidth: 0,
        maxWidth: '100%',
      },
    },
    RaListToolbar: {
      toolbar: {
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        columnGap: 16,
        rowGap: 8,
        width: '100%',
        '& > span': {
          display: 'none',
        },
      },
      actions: {
        marginLeft: 'auto',
        paddingTop: 8,
      },
    },
    RaFilterForm: {
      form: {
        marginTop: 0,
        alignItems: 'stretch',
        minHeight: 'auto',
        columnGap: 16,
        rowGap: 8,
        flex: '1 1 auto',
      },
    },
    RaFilterFormInput: {
      body: {
        flex: '0 1 260px',
        minWidth: 220,
        marginTop: 8,
        '& .MuiFormControl-root': {
          width: '100%',
        },
      },
    },
    RaSidebar: {
      fixed: {
        position: 'sticky',
        top: 0,
        width: DIAG_SIDEBAR_WIDTH,
        maxHeight: '100vh',
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: '#f3f4f6',
        borderRight: '1px solid #dfe1e2',
      },
      drawerPaper: {
        width: DIAG_SIDEBAR_WIDTH,
        backgroundColor: '#f3f4f6',
        borderRight: '1px solid #dfe1e2',
      },
    },
    RaMenuItemLink: {
      root: {
        alignItems: 'flex-start',
        whiteSpace: 'normal',
        lineHeight: 1.3,
        minHeight: 56,
        paddingTop: 10,
        paddingBottom: 10,
      },
      icon: {
        marginTop: 2,
        minWidth: 40,
      },
    },
  },
};

function DiagLayout(props) {
  return <Layout {...props} theme={diagTheme} />;
}

DiagLayout.propTypes = {
  classes: PropTypes.shape({}),
};

DiagLayout.defaultProps = {
  classes: undefined,
};

export default DiagLayout;
