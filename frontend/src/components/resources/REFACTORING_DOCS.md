# ResourceForm Refactoring Documentation

## Overview

The ResourceForm.js component was becoming too complex and difficult to maintain. It has been broken down into smaller, more focused components and custom hooks for better maintainability and reusability.

## File Structure

### Main Components
- **ResourceForm_NEW.js**: Simple wrapper around ResourceFormCore (replaces the original)
- **ResourceFormCore.js**: Main orchestration component that uses all the smaller components

### Custom Hooks
- **hooks/useResourceForm.js**: Manages form state, validation, and submission logic
- **hooks/useResourceHtmlEditor.js**: Manages HTML editor state and functionality

### UI Components
- **components/ResourceBasicFields.js**: Title and basic form fields
- **components/ResourceTypeSelector.js**: Type and subtype selection
- **components/ResourceSourceSelector.js**: AI/File/URL source selection
- **components/ResourceFileUploader.js**: File upload functionality
- **components/ResourceStudyObjectsSelector.js**: Study objects selection
- **components/ResourceOeuvresSelector.js**: Oeuvres selection
- **components/ResourceHtmlEditor.js**: HTML editing interface (standard mode)
- **components/ResourceHtmlEditingMode.js**: Full-screen HTML editing mode
- **components/ResourceAIGenerator.js**: AI generation form wrapper
- **components/ResourceFormActions.js**: Submit/Cancel buttons

### Utility Files
- **index.js**: Exports all components for easy importing

## Migration Guide

### For Existing Imports
Replace:
```javascript
import ResourceForm from './components/resources/ResourceForm';
```

With:
```javascript
import ResourceForm from './components/resources/ResourceForm_NEW';
// or
import { ResourceForm } from './components/resources';
```

### For Component Usage
The API remains exactly the same - all props and functionality are preserved:

```javascript
<ResourceForm
  open={open}
  onClose={onClose}
  session={session}
  isDialog={true}
  initialData={initialData}
  isEdit={false}
  onSuccess={onSuccess}
  // ... all other props work the same
/>
```

## Benefits of Refactoring

### 1. **Improved Maintainability**
- Each component has a single responsibility
- Easier to locate and fix bugs
- Simpler to add new features

### 2. **Better Reusability**
- Individual components can be reused in other contexts
- Custom hooks can be used in other forms
- Modular design promotes code sharing

### 3. **Enhanced Testability**
- Smaller components are easier to unit test
- Custom hooks can be tested independently
- Clear separation of concerns

### 4. **Cleaner Code Organization**
- Related functionality is grouped together
- Consistent naming conventions
- Clear file structure

### 5. **Easier Debugging**
- Smaller components make debugging simpler
- State management is centralized in hooks
- Clear data flow between components

## Component Responsibilities

### useResourceForm Hook
- Form data state management
- Validation logic
- Submission handling
- Data loading (types, study objects, oeuvres)
- File handling

### useResourceHtmlEditor Hook
- HTML content state management
- Cache busting logic
- Edit mode handling
- Save/cancel operations

### UI Components
Each UI component is responsible for:
- Rendering its specific section of the form
- Handling user interactions for its section
- Receiving data through props
- Calling callback functions provided by parent

## State Management

### Form State
Managed by `useResourceForm` hook:
- `formData`: Main form fields
- `sourceType`: Selected source type
- `selectedFile`: Uploaded file
- `resourceTypes`/`resourceSubTypes`: Loaded data
- `selectedStudyObjects`/`selectedOeuvres`: Selected items

### HTML Editor State
Managed by `useResourceHtmlEditor` hook:
- `htmlContent`: Current HTML content
- `tempHtmlContent`: Temporary content during editing
- `isEditingMode`: Whether in edit mode
- `showAiChat`: AI chat visibility

## Error Handling

- Centralized error formatting in `useResourceForm`
- Component-specific error handling where appropriate
- Consistent error display using Material-UI Alert components

## Performance Considerations

- Custom hooks prevent unnecessary re-renders
- Memoization can be added easily to individual components
- Lazy loading of components is possible if needed

## Future Enhancements

The modular structure makes it easy to:
- Add new form sections
- Implement different form variations
- Add new functionality to specific components
- Implement component-specific optimizations

## Testing Strategy

- Unit test custom hooks independently
- Test UI components with mock props
- Integration tests for the main ResourceFormCore
- End-to-end tests for complete workflows

## Backward Compatibility

The refactored components maintain 100% backward compatibility with the existing API. No changes are needed in components that use ResourceForm.