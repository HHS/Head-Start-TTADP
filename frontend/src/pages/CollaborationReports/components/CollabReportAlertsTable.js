import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Tag } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import ApproverTableDisplay from '../../../components/ApproverTableDisplay';
import Container from '../../../components/Container';
import WidgetContainer from '../../../components/WidgetContainer';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import { getStatusDisplayAndClassnames } from '../../../utils';
import TooltipWithCollection from '../../../components/TooltipWithCollection';

const CollabReportAlertsTable = ({
  emptyMsg,
  loading,
  offset,
  showCreateMsgOnEmpty,
  title,
  data,
  requestSort,
  sortConfig,
}) => {
  const tabularData = useMemo(() => data.rows.map((r) => ({
    heading: <Link to={r.link}>{r.displayId}</Link>,
    id: r.id,
    data: [
      {
        title: 'Activity name',
        value: r.name,
        tooltip: r.name,
      },
      {
        title: 'Date started',
        value: r.startDate,
      },
      {
        title: 'Creator',
        value: r.author.fullName,
        tooltip: r.author.fullName,
      },
      {
        title: 'Created date',
        value: moment(r.createdAt).format(DATE_DISPLAY_FORMAT),
      },
      {
        title: 'Collaborators',
        value: <TooltipWithCollection collection={r.collaboratingSpecialists.map((c) => c.fullName)} collectionTitle={`collaborators for ${r.displayId}`} />,
      },
      {
        title: 'Approvers',
        value: <ApproverTableDisplay approvers={r.approvers} />,
      },
      {
        value: (() => {
          const { displayStatus, statusClassName } = getStatusDisplayAndClassnames(
            r.calculatedStatus,
            r.approvers,
            false,
          );
          return (
            <Tag
              className={statusClassName}
            >
              {displayStatus}
            </Tag>
          );
        }
        )(),
      },
    ],
  })), [data.rows]);

  return (
    <>
      <WidgetContainer
        title={title}
        className="collab-alerts-table-container"
        // enableCheckboxes
        showPagingBottom={false}
        showPagingTop={false}
        loading={loading}
        loadingLabel="Collaboration reports table loading"
        totalCount={data.count}
        offset={offset}
        perPage={10}
        titleMargin={{ bottom: 3 }}
      >
        { data.rows.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0}>
          <div className="text-center padding-10">
            <p className="usa-prose text-center bold">
              <strong>{ emptyMsg }</strong>
              { showCreateMsgOnEmpty && (
              <>
                <br />
                Document your work connecting Head Start programs with state-level systems.
                <br />
                To get started, click the &quot;New Collaboration Report&quot; button.
              </>
              )}
            </p>
          </div>
        </Container>
        )}
        { data.rows.length > 0 && (
        <HorizontalTableWidget
          headers={[
            'Activity name',
            'Date started',
            'Creator',
            'Created date',
            'Collaborator',
            'Approvers',
            'Status',
          ]}
          data={tabularData}
          firstHeading="Report ID"
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          showTotalColumn={false}
          showDashForNullValue
        />
        )}
      </WidgetContainer>
    </>
  );
};

CollabReportAlertsTable.defaultProps = {
  offset: 0,
  loading: false,
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
};

CollabReportAlertsTable.propTypes = {
  emptyMsg: PropTypes.string,
  loading: PropTypes.bool,
  offset: PropTypes.number,
  data: PropTypes.shape({
    rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })),
    count: PropTypes.number,
  }).isRequired,
  // setData: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({}).isRequired,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string.isRequired,

};

export default CollabReportAlertsTable;
