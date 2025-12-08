import React, { useState } from 'react';
import { Button } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';

export const AccordionItem = ({
  title,
  id,
  content,
  expanded,
  className,
  handleToggle,
  headingSize,
  canEdit = false,
  onNavigation,
}) => {
  const headingClasses = `usa-accordion__heading ${className}`;
  const contentClasses = `usa-accordion__content usa-prose ${className}`;
  const HeadingSizeTag = `h${headingSize}`;
  return (
    <>
      <HeadingSizeTag className={headingClasses}>
        <button
          type="button"
          className="usa-accordion__button"
          aria-expanded={expanded}
          aria-controls={id}
          data-testid={`accordionButton_${id}`}
          onClick={handleToggle}
        >
          {title}
        </button>
      </HeadingSizeTag>
      <div
        id={id}
        data-testid={`accordionItem_${id}`}
        className={contentClasses}
        hidden={!expanded}
      >
        {canEdit && (
          <div className="text-right">
            <Button
              onClick={onNavigation}
              unstyled
              className="smart-hub--navigator-link flex-justify-end"
              role="button"
              aria-label={`Edit ${title}`}
            >
              Edit
            </Button>
          </div>
        )}
        {content}
      </div>
    </>
  );
};

const AccordionItemProp = {
  title: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  expanded: PropTypes.bool,
  id: PropTypes.string.isRequired,
  className: PropTypes.string,
  handleToggle: PropTypes.func,
  headingSize: PropTypes.number,
  canEdit: PropTypes.bool,
  onNavigation: PropTypes.func,
};

AccordionItem.propTypes = AccordionItemProp;

AccordionItem.defaultProps = {
  headingSize: 2,
  className: '',
  expanded: false,
  handleToggle: undefined,
  canEdit: false,
  onNavigation: undefined,
};

export const Accordion = ({
  bordered,
  items,
  pages,
  multiselectable,
  headingSize,
  canEdit = false,
}) => {
  const [openItems, setOpenState] = useState(
    items.filter((i) => !!i.expanded).map((i) => i.id),
  );

  const classes = bordered ? 'usa-accordion usa-accordion--bordered' : 'usa-accordion';

  const toggleItem = (itemId) => {
    const newOpenItems = [...openItems];
    const itemIndex = openItems.indexOf(itemId);
    const isMultiselectable = multiselectable;

    if (itemIndex > -1) {
      newOpenItems.splice(itemIndex, 1);
    } else if (isMultiselectable) {
      newOpenItems.push(itemId);
    } else {
      newOpenItems.splice(0, newOpenItems.length);
      newOpenItems.push(itemId);
    }
    setOpenState(newOpenItems);
  };

  const itemNavigation = pages ? items.map((item) => {
    const page = pages.find((pagesItem) => pagesItem.label === item.title);
    return {
      id: item.id,
      onNavigation: page.onNavigation,
    };
  }) : [];

  return (
    <div
      className={classes}
      data-testid="accordion"
    >
      {items.map((item) => (
        <AccordionItem
          key={`accordionItem_${item.id}`}
          title={item.title}
          id={item.id}
          content={item.content}
          className={item.className}
          expanded={openItems.includes(item.id)}
          handleToggle={() => {
            toggleItem(item.id);
          }}
          headingSize={headingSize}
          canEdit={canEdit}
          onNavigation={itemNavigation.find((nav) => nav.id === item.id)?.onNavigation}
        />
      ))}
    </div>
  );
};

Accordion.propTypes = {
  bordered: PropTypes.bool,
  multiselectable: PropTypes.bool,
  items: PropTypes.arrayOf(PropTypes.shape(AccordionItemProp)).isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    review: PropTypes.bool,
    state: PropTypes.string,
    label: PropTypes.string,
    onNavigation: PropTypes.func,
  })),
  headingSize: PropTypes.number,
  canEdit: PropTypes.bool,
};

Accordion.defaultProps = {
  bordered: false,
  multiselectable: false,
  headingSize: 2,
  canEdit: false,
  pages: null,
};

export default Accordion;
