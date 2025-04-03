import React from "react";
import PropTypes from "prop-types";
import { Tag as TrussTag } from "@trussworks/react-uswds";
import classnames from "classnames";
import "./Tag.scss";

export default function Tag({ children, className, clickable, handleClick }) {
  const tagClass = classnames("ttahub-tag", className, {
    "ttahub-tag-underline": clickable,
  });
  return (
    <TrussTag className={tagClass} onClick={handleClick}>
      {children}
    </TrussTag>
  );
}

Tag.propTypes = {
  clickable: PropTypes.bool,
};
