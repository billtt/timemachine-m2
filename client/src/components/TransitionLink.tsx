import React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { withViewTransition } from '../utils/viewTransition';

// Link that animates navigation with the View Transitions API when available.
const TransitionLink: React.FC<LinkProps> = ({ to, onClick, children, ...rest }) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Let the browser handle modified clicks (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    withViewTransition(() => navigate(to));
  };

  return (
    <Link to={to} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
};

export default TransitionLink;
