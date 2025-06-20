import React from 'react';
import PropTypes from 'prop-types';
import Drawer from '../../../../../components/Drawer';

export default function GoalMergeGuidanceDrawer({ drawerTriggerRef }) {
  if (!drawerTriggerRef) {
    return null;
  }

  return (
    <Drawer
      triggerRef={drawerTriggerRef}
      stickyHeader
      stickyFooter
      title="Merging goals"
    >
      <p className="usa-prose margin-top-0">
        Merging goals allows you to combine similar goal statements into one goal,
        so there is less duplication and clutter when you&apos;re reviewing goals.
        You won&apos;t lose any of the prior work. All the work you&apos;ve done on these
        similar goals will then be displayed under the single merged goal.
      </p>
      <p className="usa-prose text-bold margin-bottom-0">Goal</p>
      <p className="usa-prose margin-top-0">
        One version of the goal will be selected to keep for future Activity Reports and
        status changes. The other goal(s) will only appear in legacy Activity Reports,
        but all information will be retained.
      </p>

      <p className="usa-prose text-bold margin-bottom-0">Objectives</p>
      <p className="usa-prose margin-top-0">
        Objectives from all goals will be retained and will appear under the merged goal,
        ordered by Last TTA date.
      </p>

      <p className="usa-prose text-bold margin-bottom-0">Topics</p>
      <p className="usa-prose margin-top-0">
        Topics from all goals/objectives will be retained and displayed.
      </p>

      <p className="usa-prose text-bold margin-bottom-0">Created on</p>
      <p className="usa-prose margin-top-0">
        The earliest created on date of all merged goals will be displayed.
      </p>

      <p className="usa-prose text-bold margin-bottom-0">Last TTA</p>
      <p className="usa-prose margin-top-0">
        The most recent TTA activity date will be displayed.
      </p>

      <p className="usa-prose text-bold margin-bottom-0">Goal status</p>
      <p className="usa-prose margin-top-0">
        Unless all goals being merged are closed, the goal&apos;s
        status will be editable after merging, and the resulting
        merged status will be set according to the following rules:
      </p>
      <ul className="usa-list">
        <li>
          If all selected goals being merged are of the same status,
          the merged goal will have that status
        </li>
        <li>
          If any of the selected goals have a status of In progress,
          the merged goal&apos;s status will be In progress
        </li>
        <li>
          If the selected goals are a mix of Not started and Suspended goals,
          the merged goal&apos;s status will be Suspended.
        </li>
        <li>
          If the selected goals are a mix of Suspended and Closed goals,
          the merged goal&apos;s status will be Closed.
        </li>
        <li>
          If the selected goals are a mix of Not started and Closed goals,
          the merged goal&apos;s status will be Closed.
        </li>
      </ul>
    </Drawer>
  );
}

GoalMergeGuidanceDrawer.propTypes = {
  drawerTriggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};
