# HTML Editor - Ergonomic Improvements

## Implemented Changes

### Progressive Disclosure Pattern
The HTML editor AI chat now follows a progressive disclosure pattern to improve user experience:

1. **Initial State**: When users access the resource edit page, only the HTML editor is visible
2. **AI Activation**: Users can click "Edit with AI" button to reveal the AI assistant
3. **Full-Screen Mode**: Clicking the button automatically collapses the sidenav for a full-screen editing experience

### New Components

#### LayoutContext (`frontend/src/contexts/LayoutContext.js`)
- **Purpose**: Provides sidenav control functions to child components
- **Exports**: `useLayout()` hook for accessing layout state
- **Functions**: Controls sidenav open/close state and chatbox visibility

#### Updated App.js
- **LayoutContext Provider**: Wraps the main layout to expose sidenav controls
- **Context Value**: Provides access to `handleSidebarClose`, `handleSidebarOpen`, etc.

#### Enhanced ResourceForm.js
- **New State**: `showAiChat` to control AI assistant visibility
- **Edit with AI Button**: Triggers AI assistant display and sidenav collapse
- **Progressive Layout**: Dynamically adjusts editor width (full-width vs 8/12 columns)
- **Toggle Functionality**: Users can show/hide the AI assistant after activation

### User Experience Flow

```
1. User navigates to resource edit page
   ↓
2. Only HTML editor is visible (clean interface)
   ↓
3. User clicks "Edit with AI" button
   ↓
4. Sidenav collapses + AI chat appears
   ↓
5. Full-screen editing mode with AI assistance
```

### Key Features

#### Visual Indicators
- **Primary Button**: "Edit with AI" with AI icon (Psychology icon)
- **Secondary Button**: Show/Hide toggle for activated AI assistant
- **Responsive Layout**: Editor adapts from full-width to 8/12 columns when AI is active

#### Performance Benefits
- **Reduced Cognitive Load**: Clean initial interface without distractions
- **Contextual Help**: AI assistance appears only when needed
- **Space Optimization**: Automatic sidenav collapse maximizes editing space

#### Technical Implementation
- **Context-Based**: Uses React Context for cross-component communication
- **Conditional Rendering**: Efficient component mounting/unmounting
- **Responsive Design**: Maintains functionality across screen sizes

### Code Structure

```
frontend/src/
├── contexts/
│   └── LayoutContext.js          # New: Layout state management
├── components/resources/
│   └── ResourceForm.js           # Enhanced: Progressive disclosure
└── App.js                        # Updated: Context provider
```

### Memory Integration
This implementation follows the progressive disclosure pattern recorded in project memories for AI features, providing an optimal balance between functionality and usability while maintaining the project's clean interface design philosophy.