/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import Container from './Container';
import PaginationCard from './PaginationCard';
import WidgetContainerTitleGroup from './WidgetContainerTitleGroup';
import './WidgetContainer.scss';

export default function WidgetContainer(
  {
    title,
    subtitle,
    children,
    showPagingBottom,
    showPagingTop,
    loading,
    loadingLabel,
    currentPage,
    totalCount,
    offset,
    perPage,
    handlePageChange,
    error,
    showHeaderBorder,
    titleSlot,
  },
) {
  return (
    <Container className="smart-hub-widget-container width-full shadow-2 padding-top-0" paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      <WidgetContainerTitleGroup
        title={title}
        subtitle={subtitle}
        showHeaderBorder={showHeaderBorder}
        showPagingTop={showPagingTop}
      >
        {titleSlot}
      </WidgetContainerTitleGroup>
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
          showPagingBottom
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
  showPagingBottom: PropTypes.bool,
  showPagingTop: PropTypes.bool,
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
  currentPage: PropTypes.number,
  totalCount: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func,
  error: PropTypes.string,
  showHeaderBorder: PropTypes.bool,
  titleSlot: PropTypes.node,
};

WidgetContainer.defaultProps = {
  title: null,
  subtitle: null,
  showPagingBottom: false,
  showPagingTop: false,
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: () => { },
  showHeaderBorder: true,
  error: null,
  titleSlot: null,
};
