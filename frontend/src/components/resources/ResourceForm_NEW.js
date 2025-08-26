import React from 'react';
import ResourceFormCore from './ResourceFormCore';

/**
 * Resource Form component - simplified wrapper around ResourceFormCore
 * 
 * This component has been refactored into smaller, more maintainable pieces:
 * - ResourceFormCore: Main orchestration component
 * - useResourceForm: Custom hook for form state management
 * - useResourceHtmlEditor: Custom hook for HTML editing functionality
 * - Individual UI components for each section (BasicFields, TypeSelector, etc.)
 */
const ResourceForm = (props) => {
  return <ResourceFormCore {...props} />;
};

export default ResourceForm;