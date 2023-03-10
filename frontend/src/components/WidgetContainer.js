/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import Container from './Container';
import PaginationCard from './PaginationCard';

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
  },
) {
  return (
    <Container className="width-full shadow-2 padding-top-0" paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      {
        !title && !subtitle
          ? null
          : (
            <div className="margin-bottom-1 padding-top-3 padding-left-3 margin-bottom-3">
              <h2 className="smart-hub--table-widget-heading margin-0 font-sans-lg">{title}</h2>
              <p className="usa-prose margin-0">{subtitle}</p>
            </div>
          )
      }
      <div className="margin-top-0">
        {children}
      </div>
      <div>
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
};
