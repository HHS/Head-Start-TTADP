import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useSessionSort from '../hooks/useSessionSort';
import { COURSES_PER_PAGE } from '../Constants';

export const parseValue = (value) => {
  const noCommasValue = value.replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};
function RecipientsWithNoTtaWidget({
  data,
  loading,
  resetPagination,
  setResetPagination,
  perPageNumber,
}) {
  const [recipientsToUse, setRecipientsToUse] = useState([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: '1',
    direction: 'desc',
    activePage: 1,
  }, 'activityReportsTable');
  const [recipientsPerPage, setRecipientsPerPage] = useState([]);
  const [checkBoxes, setCheckBoxes] = useState({});

  const { activePage } = sortConfig;

  const [offset, setOffset] = useState((activePage - 1) * perPageNumber);

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      const recipientToUse = data.RecipientsWithNoTta || [];
      setRecipientsToUse(recipientToUse);
      setRecipientCount(recipientToUse.length);
    } finally {
      setLocalLoading(false);
    }
  }, [data]);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 });
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [activePage, resetPagination, setResetPagination, setSortConfig, sortConfig, data]);

  const handlePageChange = (pageNumber) => {
    if (!loading) {
      // copy state
      const sort = { ...sortConfig };

      // mutate
      sort.activePage = pageNumber;

      // store it
      setSortConfig(sort);
      setOffset((pageNumber - 1) * perPageNumber);
    }
  };

  const requestSort = (sortBy) => {
    // Get sort direction.
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    const sortingCourseName = sortBy === 'Course_name';

    // Set the value we want to sort by.
    const valuesToSort = sortingCourseName
      ? recipientsToUse.map((t) => ({
        ...t,
        sortBy: t.heading,
      }))
      : recipientsToUse.map((t) => (
        {
          ...t,
          sortBy: parseValue(t.data.find((tp) => tp.title === sortBy).value),
        }));

    // Value sort.
    const sortValueA = direction === 'asc' ? 1 : -1;
    const sortValueB = direction === 'asc' ? -1 : 1;
    valuesToSort.sort((a, b) => {
      const valueA = sortingCourseName ? a.sortBy.toString().toLowerCase() : a.sortBy;
      const valueB = sortingCourseName ? b.sortBy.toString().toLowerCase() : b.sortBy;

      if (valueA > valueB) {
        return sortValueA;
      } if (valueB > valueA) {
        return sortValueB;
      }

      return 0;
    });
    setRecipientsToUse(valuesToSort);
    setOffset(0);
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  const exportRows = (exportType) => {
    let url = null;
    try {
      let recipientsToExport = recipientsToUse;
      if (exportType === 'selected') {
      // Get all the ids of the rowsToExport that have a value of true.
        const selectedRowsStrings = Object.keys(checkBoxes).filter((key) => checkBoxes[key]);
        // Loop all selected rows and parseInt to an array of integers.
        const selectedRowsIds = selectedRowsStrings.map((s) => parseInt(s, DECIMAL_BASE));
        // Filter the recipients to export to only include the selected rows.
        recipientsToExport = recipientsToUse.filter((row) => selectedRowsIds.includes(row.id));
      }

      // Create a header row.
      const headerData = data.headers.map((h) => ({ title: h, value: h }));
      recipientsToExport = [
        {
          heading: 'Course',
          data: headerData,
        },
        ...recipientsToExport,
      ];

      // create a csv file of all the rows.
      const csvRows = recipientsToExport.map((row) => {
        const rowValues = row.data.map((d) => d.value);
        // If the heading has a comma, wrap it in quotes.
        const rowHeadingToUse = row.heading.includes(',') ? `"${row.heading}"` : row.heading;
        return `${rowHeadingToUse},${rowValues.join(',')}`;
      });
      // Create CSV.
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });

      // Check if url exists with the attribute of download.
      if (document.getElementsByName('download').length > 0) {
        document.getElementsByName('download')[0].remove();
      }
      url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'recipientsWithNoTta.csv');
      document.body.appendChild(a);
      a.click();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      window.URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    setRecipientsPerPage(recipientsToUse.slice(offset, offset + perPageNumber));
  }, [offset, perPageNumber, recipientsToUse]);

  const getSubtitleWithPct = () => {
    const totalRecipients = 159;
    return `${recipientCount} of ${totalRecipients} (${((recipientCount / totalRecipients) * 100).toFixed(2)}%) recipients`;
  };

  return (
    <WidgetContainer
      title="Recipients with no TTA"
      subtitle="Recipients without Activity Reports or Training Reports for more than 90 days."
      subtitle2={getSubtitleWithPct()}
      loading={loading || localLoading}
      loadingLabel="Recipients with no TTA loading"
      showPagingBottom
      currentPage={activePage}
      totalCount={recipientCount}
      offset={offset}
      perPage={perPageNumber}
      handlePageChange={handlePageChange}
      enableCheckboxes
      exportRows={exportRows}
    >
      <HorizontalTableWidget
        headers={data.headers || []}
        data={recipientsPerPage || []}
        firstHeading="Recipient"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
        enableCheckboxes
        checkboxes={checkBoxes}
        setCheckboxes={setCheckBoxes}
        showTotalColumn={false}
      />
    </WidgetContainer>
  );
}

RecipientsWithNoTtaWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.shape({
      headers: PropTypes.arrayOf(PropTypes.string),
      RecipientsWithNoTta: PropTypes.arrayOf(
        PropTypes.shape({
          recipient: PropTypes.string,
          dateOfLastTta: PropTypes.date,
          daysSinceLastTta: PropTypes.number,
        }),
      ),
    }),
    PropTypes.shape({}),
  ]),
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func,
  perPageNumber: PropTypes.number,
  loading: PropTypes.bool.isRequired,
};

RecipientsWithNoTtaWidget.defaultProps = {
  data: { headers: [], RecipientsWithNoTta: [] },
  resetPagination: false,
  setResetPagination: () => {},
  perPageNumber: COURSES_PER_PAGE,
};

export default RecipientsWithNoTtaWidget;
