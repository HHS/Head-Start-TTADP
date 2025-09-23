import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import Container from '../Container';
import PaginationCard from '../PaginationCard';
import WidgetContainerTitleGroup from './WidgetContainerTitleGroup';
import './index.scss';

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
    className,
    menuItems,
    footNote,
    enableCheckboxes,
    titleMargin,
    displayPaginationBoxOutline,
    paginationCardTopProps,
    menuClassNames,
    titleGroupClassNames,
  },
) {
  return (
    <Container className={`smart-hub-widget-container width-full height-full shadow-2 padding-top-0 ${className}`} paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      <WidgetContainerTitleGroup
        titleMargin={titleMargin}
        title={title}
        subtitle={subtitle}
        showHeaderBorder={showHeaderBorder}
        menuClassNames={menuClassNames}
        className={titleGroupClassNames}
        pagination={showPagingTop ? (
          <PaginationCard
            currentPage={currentPage}
            totalCount={totalCount}
            offset={offset}
            perPage={perPage}
            handlePageChange={handlePageChange}
              // eslint-disable-next-line react/jsx-props-no-spreading
            {...paginationCardTopProps}
          />
        ) : null}
        menuItems={menuItems}
        enableCheckboxes={enableCheckboxes}
      >
        {titleSlot}
      </WidgetContainerTitleGroup>
      {error && (
      <Grid row>
        <Alert className="width-full margin-x-3 margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
      </Grid>
      )}
      <div className="margin-top-0">
        {children}
      </div>
      {showPagingBottom || footNote ? (
        <div className={`border-bottom smart-hub-border-base-lighter padding-3 ${displayPaginationBoxOutline ? 'smart-hub-border-base--pagination-box' : ''}`}>
          {footNote && (
          <p className="usa-prose font-sans-3xs margin-top-0">
            {footNote}
          </p>
          )}
          {showPagingBottom && (
            <PaginationCard
              currentPage={currentPage}
              totalCount={totalCount}
              offset={offset}
              perPage={perPage}
              handlePageChange={handlePageChange}
              displayPaginationBoxOutline={displayPaginationBoxOutline}
            />
          )}
        </div>
      ) : null}
    </Container>
  );
}

WidgetContainer.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  children: PropTypes.node,
  showPagingBottom: PropTypes.bool,
  showPagingTop: PropTypes.bool,
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string,
  currentPage: PropTypes.number,
  totalCount: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func,
  paginationCardTopProps: PropTypes.shape({
    handlePageChange: PropTypes.func,
    noXofX: PropTypes.bool,
    spaceBetweenSelectPerPageAndContext: PropTypes.number,
  }),
  error: PropTypes.string,
  showHeaderBorder: PropTypes.bool,
  titleSlot: PropTypes.node,
  className: PropTypes.string,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  })),
  footNote: PropTypes.string,
  displayPaginationBoxOutline: PropTypes.bool,
  enableCheckboxes: PropTypes.bool,
  titleMargin: PropTypes.shape({
    bottom: PropTypes.number,
    top: PropTypes.number,
    right: PropTypes.number,
    left: PropTypes.number,
  }),
  menuClassNames: PropTypes.string,
  titleGroupClassNames: PropTypes.string,
};

WidgetContainer.defaultProps = {
  children: <></>,
  title: null,
  subtitle: null,
  showPagingBottom: false,
  showPagingTop: false,
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: null,
  paginationCardTopProps: {},
  showHeaderBorder: true,
  error: null,
  titleSlot: null,
  loadingLabel: 'Loading',
  titleGroupClassNames: 'padding-x-3 padding-top-3 position-relative desktop:display-flex flex-justify flex-align-center flex-gap-2',
  menuClassNames: 'position-absolute right-0 margin-top-3 margin-right-3 top-0',
  className: '',
  menuItems: [],
  footNote: null,
  enableCheckboxes: false,
  titleMargin: {
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  },
  displayPaginationBoxOutline: false,
};
