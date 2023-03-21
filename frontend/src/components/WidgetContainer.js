/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import Container from './Container';
import PaginationCard from './PaginationCard';
import './WidgetContainer.scss';

export default function WidgetContainer(
  {
    title,
    subtitle,
    children,
    showPaging,
    loading,
    loadingLabel,
    currentPage,
    totalCount,
    offset,
    perPage,
    handlePageChange,
    error,
  },
) {
  return (
    <Container className="smart-hub-widget-container width-full shadow-2 padding-top-0" paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      {
        !title && !subtitle
          ? null
          : (
            <div className="smart-hub-widget-container-header padding-3">
              <h2 className="smart-hub--table-widget-heading margin-0 font-sans-lg">{title}</h2>
              <p className="usa-prose margin-0">{subtitle}</p>
            </div>
          )
      }
      <Grid row>
        {error && (
        <Alert className="width-full margin-x-3 margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
        )}
      </Grid>
      <div className="margin-top-0">
        {children}
      </div>
      <div className="smart-hub-widget-container-footer">
        {
          showPaging
            ? (
              <PaginationCard
                currentPage={currentPage}
                totalCount={totalCount}
                offset={offset}
                perPage={perPage}
                handlePageChange={handlePageChange}
              />
            )
            : null
        }
      </div>
    </Container>
  );
}

WidgetContainer.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  showPaging: PropTypes.bool,
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
  currentPage: PropTypes.number,
  totalCount: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func,
  error: PropTypes.string,
};

WidgetContainer.defaultProps = {
  title: null,
  subtitle: null,
  showPaging: false,
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: () => { },
  error: null,
};
