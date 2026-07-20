/* eslint-disable no-restricted-syntax -- this is the approved implementation. */
import React from 'react';

type ExternalLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

/** A safe, new-tab link for destinations outside the extension. */
const ExternalLink: React.FC<ExternalLinkProps> = ({ children, ...props }) => (
  <a target="_blank" rel="noopener noreferrer" {...props}>
    {children}
  </a>
);

export default ExternalLink;
