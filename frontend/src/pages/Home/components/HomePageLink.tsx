import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link as UswdsLink } from '@trussworks/react-uswds';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import colors from '../../../colors';
import WidgetCard from '../../../components/WidgetCard';

export interface HomePageLinkProps {
  title: string;
  description: string;
  linkLabel: string;
  destination: string;
  icon: IconDefinition;
  external?: boolean;
}

export default function HomePageLink({
  title,
  description,
  linkLabel,
  destination,
  icon,
  external = false,
}: HomePageLinkProps): React.ReactElement {
  const linkClassName =
    'usa-button usa-button--outline margin-top-auto margin-bottom-0 maxw-full text-wrap';

  return (
    <WidgetCard className="height-full margin-bottom-0">
      <div className="display-block tablet:display-flex flex-align-center flex-gap-2 height-full">
        <div
          aria-hidden="true"
          className="width-6 height-6 flex-shrink-0 display-flex flex-align-center flex-justify-center radius-pill margin-bottom-2 tablet:margin-bottom-0"
          style={{ backgroundColor: colors.ttahubBlueLight }}
        >
          <FontAwesomeIcon icon={icon} color={colors.ttahubMediumBlue} size="lg" />
        </div>
        <div
          className="display-flex flex-column flex-align-start flex-1 minw-0 maxw-full"
          style={{ overflowWrap: 'anywhere' }}
        >
          <h2 className="smart-hub-title-big-serif text-bold line-height-serif-2 margin-top-0 margin-bottom-2">
            {title}
          </h2>
          <p className="margin-top-0 margin-bottom-2">{description}</p>
          {external ? (
            <UswdsLink className={linkClassName} href={destination}>
              {linkLabel}
            </UswdsLink>
          ) : (
            <RouterLink className={linkClassName} to={destination}>
              {linkLabel}
            </RouterLink>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
