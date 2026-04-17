/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
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
      },
      contentWithSidebar: {
        alignItems: 'flex-start',
        minWidth: 0,
      },
      content: {
        minWidth: 0,
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
      },
      drawerPaper: {
        width: DIAG_SIDEBAR_WIDTH,
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
