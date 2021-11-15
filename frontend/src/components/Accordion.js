import React, { useState } from 'react';
import PropTypes from 'prop-types';

export const AccordionItem = ({
  title,
  id,
  content,
  expanded,
  className,
  handleToggle,
  headingSize,
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
        {content}
      </div>
    </>
  );
};

AccordionItem.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  expanded: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired,
  className: PropTypes.string,
  handleToggle: PropTypes.func,
  headingSize: PropTypes.number.isRequired,
};

AccordionItem.defaultProps = {
  className: '',
  handleToggle: () => { },
};

export const Accordion = ({
  bordered,
  items,
  multiselectable,
  headingSize,
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

  return (
    <div
      className={classes}
      data-testid="accordion"
      aria-multiselectable={multiselectable || undefined}
    >
      {items.map((item) => (
        <AccordionItem
          key={`accordionItem_${item.id}`}
          title={item.title}
          id={item.id}
          content={item.content}
          className={item.className}
          expanded={openItems.indexOf(item.id) > -1}
          handleToggle={() => {
            toggleItem(item.id);
          }}
          headingSize={headingSize}
        />
      ))}
    </div>
  );
};

Accordion.propTypes = {
  bordered: PropTypes.bool,
  multiselectable: PropTypes.bool,
  items: PropTypes.arrayOf(PropTypes.shape(AccordionItem)).isRequired,
  headingSize: PropTypes.number,
};

Accordion.defaultProps = {
  bordered: false,
  multiselectable: false,
  headingSize: 2,
};

export default Accordion;
