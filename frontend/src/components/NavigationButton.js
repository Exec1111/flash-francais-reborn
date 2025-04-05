import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Link } from '@mui/material';

const NavigationButton = ({ to, children, variant = 'text', ...props }) => {
  return (
    <Button
      component={RouterLink}
      to={to}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
};

export default NavigationButton;
