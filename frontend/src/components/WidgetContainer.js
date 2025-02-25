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
    subtitle2,
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
    displayTable,
    setDisplayTable,
    enableCheckboxes,

    // slot components
    SubtitleDrawer,
    TitleDrawer,
    widgetContainerTitleClass,
    displayPaginationBoxOutline,

    showFiltersNotApplicable,
  },
) {
  return (
    <Container className={`smart-hub-widget-container width-full shadow-2 padding-top-0 ${className}`} paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      <WidgetContainerTitleGroup
        className={widgetContainerTitleClass}
        title={title}
        subtitle={subtitle}
        subtitle2={subtitle2}
        showHeaderBorder={showHeaderBorder}
        displayTable={displayTable}
        setDisplayTable={setDisplayTable}
        showFiltersNotApplicable={showFiltersNotApplicable}
        pagination={showPagingTop ? (
          <PaginationCard
            currentPage={currentPage}
            totalCount={totalCount}
            offset={offset}
            perPage={perPage}
            handlePageChange={handlePageChange}
            className="flex-justify-self-end"
          />
        ) : null}
        TitleDrawer={() => TitleDrawer || null}
        SubtitleDrawer={() => SubtitleDrawer || null}
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
  subtitle: PropTypes.string,
  subtitle2: PropTypes.string,
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
  error: PropTypes.string,
  showHeaderBorder: PropTypes.bool,
  titleSlot: PropTypes.node,
  className: PropTypes.string,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  })),
  footNote: PropTypes.string,
  displayTable: PropTypes.bool,
  setDisplayTable: PropTypes.func,

  // Drawer components
  SubtitleDrawer: PropTypes.node,
  TitleDrawer: PropTypes.node,

  widgetContainerTitleClass: PropTypes.string,
  displayPaginationBoxOutline: PropTypes.bool,
  enableCheckboxes: PropTypes.bool,
  showFiltersNotApplicable: PropTypes.bool,
};

WidgetContainer.defaultProps = {
  children: <></>,
  title: null,
  subtitle: null,
  subtitle2: null,
  showPagingBottom: false,
  showPagingTop: false,
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: null,
  showHeaderBorder: true,
  error: null,
  titleSlot: null,
  loadingLabel: 'Loading',
  className: '',
  menuItems: [],
  footNote: null,
  displayTable: false,
  setDisplayTable: null,
  enableCheckboxes: false,

  // Drawer components
  SubtitleDrawer: null,
  TitleDrawer: null,
  widgetContainerTitleClass: 'padding-x-3',
  displayPaginationBoxOutline: false,
  showFiltersNotApplicable: false,
};
