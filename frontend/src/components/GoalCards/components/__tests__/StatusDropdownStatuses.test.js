import React from 'react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import STATUSES from '../StatusDropdownStatuses';
import colors from '../../../../colors';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Draft,
  Paused,
} from '../../../icons';

describe('StatusDropdownStatuses', () => {
  it('should have correct properties for "In progress"', () => {
    const status = STATUSES['In progress'];
    expect(status.display).toBe(GOAL_STATUS.IN_PROGRESS);
    expect(status.color).toBe(colors.ttahubMediumBlue);
    expect(status.icon.type).toBe(InProgress);
    expect(typeof status.IconWithProps).toBe('function');
    const Icon = status.IconWithProps;
    const renderedIcon = <Icon data-testid="test-icon" />;
    expect(status.icon.type).toBe(InProgress);
    expect(renderedIcon.props['data-testid']).toBe('test-icon');
    status.IconWithProps({}); // explicitly call for coverage
  });

  it('should have correct properties for "Closed"', () => {
    const status = STATUSES.Closed;
    expect(status.display).toBe(GOAL_STATUS.CLOSED);
    expect(status.color).toBe(colors.success);
    expect(status.icon.type).toBe(Closed);
    expect(typeof status.IconWithProps).toBe('function');
    const Icon = status.IconWithProps;
    const renderedIcon = <Icon data-testid="test-icon" />;
    expect(status.icon.type).toBe(Closed);
    expect(renderedIcon.props['data-testid']).toBe('test-icon');
    status.IconWithProps({}); // explicitly call for coverage
  });

  it('should have correct properties for "Draft"', () => {
    const status = STATUSES.Draft;
    expect(status.display).toBe(GOAL_STATUS.DRAFT);
    expect(status.color).toBe(colors.ttahubBlue);
    expect(status.icon.type).toBe(Draft);
    expect(typeof status.IconWithProps).toBe('function');
    const Icon = status.IconWithProps;
    const renderedIcon = <Icon data-testid="test-icon" />;
    expect(status.icon.type).toBe(Draft);
    expect(renderedIcon.props['data-testid']).toBe('test-icon');
    status.IconWithProps({}); // explicitly call for coverage
  });

  it('should have correct properties for "Not Started"', () => {
    const status = STATUSES['Not Started'];
    expect(status.display).toBe(GOAL_STATUS.NOT_STARTED);
    expect(status.color).toBe(colors.warning);
    expect(status.icon.type).toBe(NotStarted);
    expect(typeof status.IconWithProps).toBe('function');
    const Icon = status.IconWithProps;
    const renderedIcon = <Icon data-testid="test-icon" />;
    expect(status.icon.type).toBe(NotStarted);
    expect(renderedIcon.props['data-testid']).toBe('test-icon');
    status.IconWithProps({}); // explicitly call for coverage
  });

  it('should have correct properties for "Suspended"', () => {
    const status = STATUSES.Suspended;
    expect(status.display).toBe(GOAL_STATUS.SUSPENDED);
    expect(status.color).toBe(colors.errorDark);
    expect(status.icon.type).toBe(Paused);
    expect(typeof status.IconWithProps).toBe('function');
    const Icon = status.IconWithProps;
    const renderedIcon = <Icon data-testid="test-icon" />;
    expect(status.icon.type).toBe(Paused);
    expect(renderedIcon.props['data-testid']).toBe('test-icon');
    status.IconWithProps({}); // explicitly call for coverage
  });

  it('should have correct properties for "Needs Status"', () => {
    const status = STATUSES['Needs Status'];
    expect(status.display).toBe('Needs status');
    expect(status.color).toBe(colors.baseLighter);
    expect(status.icon.type).toBe(NoStatus);
    expect(typeof status.IconWithProps).toBe('function');
    const Icon = status.IconWithProps;
    const renderedIcon = <Icon data-testid="test-icon" />;
    expect(status.icon.type).toBe(NoStatus);
    expect(renderedIcon.props['data-testid']).toBe('test-icon');
    status.IconWithProps({}); // explicitly call for coverage
  });

  // aliases
  it('should handle "In Progress" alias correctly', () => {
    expect(STATUSES['In Progress'].display).toBe(STATUSES['In progress'].display);
    expect(STATUSES['In Progress'].color).toBe(STATUSES['In progress'].color);
    expect(STATUSES['In Progress'].icon.type).toBe(STATUSES['In progress'].icon.type);
    STATUSES['In Progress'].IconWithProps({}); // explicitly call for coverage
  });

  it('should handle "Completed" alias correctly', () => {
    const completedStatus = STATUSES.Completed;
    expect(completedStatus.display).toBe(GOAL_STATUS.CLOSED);
    expect(completedStatus.color).toBe(colors.success);
    expect(completedStatus.icon.type).toBe(Closed);
    expect(typeof completedStatus.IconWithProps).toBe('function');
    completedStatus.IconWithProps({}); // explicitly call for coverage
  });

  it('should handle "Complete" alias correctly', () => {
    const completeStatus = STATUSES.Complete;
    expect(completeStatus.display).toBe('Complete');
    expect(completeStatus.color).toBe(colors.success);
    expect(completeStatus.icon.type).toBe(Closed);
    expect(typeof completeStatus.IconWithProps).toBe('function');
    completeStatus.IconWithProps({}); // explicitly call for coverage
  });
});
