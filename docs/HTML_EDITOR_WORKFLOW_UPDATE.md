# HTML Editor Workflow Update

## Overview

The HTML editing workflow in the resource modification page has been updated to provide a more intuitive user experience with clear separation between viewing and editing modes.

## New Workflow

### 1. Initial State (Standard Mode)
When arriving on a resource modification page:
- **No immediate HTML content display**
- **Simple link** to view the HTML document in a new tab (similar to consultation page)
- **"Edit Content" button** replaces the previous "Edit with AI" button

### 2. Content Viewing
- Click the **"Consulter le contenu"** link to open HTML document in new tab
- Uses the same viewing mechanism as the consultation page
- Clean, distraction-free preview

### 3. Editing Mode Activation
- Click **"Éditer le contenu"** to enter special editing mode
- Automatically collapses sidenav for full-screen experience
- Switches interface to editing view

### 4. Special Editing Mode
Provides comprehensive editing tools:
- **Manual HTML editor** (TinyMCE)
- **Optional AI assistance** - "Activer l'IA" button
- **Save button** specific to this mode
- **Cancel button** to exit without saving

### 5. AI Integration
- **Progressive activation**: AI assistant only appears when requested
- **Side-by-side layout**: Editor (8 cols) + AI Chat (4 cols)
- **Toggle visibility**: Show/hide AI assistant as needed
- **Contextual help**: AI understands current HTML content

### 6. Save Process
- **Dedicated save button** in editing mode
- **Backend integration**: Calls resource update API with HTML content
- **Automatic return**: After saving, returns to standard mode
- **Success feedback**: Clear confirmation of save operation

## Technical Implementation

### New State Variables
```javascript
const [isEditingMode, setIsEditingMode] = useState(false);
const [tempHtmlContent, setTempHtmlContent] = useState('');
```

### Key Functions
- `handleEditContent()`: Switches to editing mode
- `handleSaveHtmlContent()`: Saves HTML and returns to standard mode
- `handleCancelEditing()`: Cancels editing without saving
- `handleActivateAI()`: Enables AI assistant during editing

### UI Components

#### Standard Mode View
```jsx
<Link onClick={openHtmlInNewTab}>
  <LinkIcon /> Consulter le contenu <OpenInNewIcon />
</Link>
<Button onClick={handleEditContent}>
  <EditIcon /> Éditer le contenu
</Button>
```

#### Editing Mode View
```jsx
<TinyHtmlEditor 
  initialHtml={tempHtmlContent} 
  onChange={setTempHtmlContent} 
/>
{showAiChat && (
  <HtmlChatBot
    currentHtml={tempHtmlContent}
    onHtmlChange={setTempHtmlContent}
  />
)}
<Button onClick={handleSaveHtmlContent}>
  <SaveIcon /> Sauvegarder
</Button>
```

## Benefits

### User Experience
1. **Cleaner initial interface** - No overwhelming HTML editor on page load
2. **Clear intent separation** - View vs Edit modes are distinct
3. **Progressive disclosure** - Advanced features (AI) appear when needed
4. **Focused editing** - Full-screen mode for distraction-free editing
5. **Safe saving** - Dedicated save action with confirmation

### Technical Benefits
1. **Temporary content management** - Changes stored in `tempHtmlContent` until saved
2. **Rollback capability** - Cancel returns to original content
3. **Backend integration** - Proper API calls for HTML content updates
4. **Error handling** - Comprehensive error management for save operations
5. **State management** - Clean separation of viewing and editing states

## Integration Points

### ResourceForm Component
- Maintains backward compatibility
- Only affects HTML editing functionality
- Preserves all other form features

### Backend API
- Uses existing `resourceService.update()` method
- Sends HTML content via FormData
- Maintains existing authentication and validation

### Layout Management
- Integrates with existing LayoutContext
- Manages sidenav collapse for full-screen editing
- Responsive design maintained

## Usage Examples

### Viewing Content
1. Navigate to resource edit page
2. See link: "Consulter le contenu"
3. Click to open HTML in new tab
4. Clean preview without editing interface

### Editing Content
1. Click "Éditer le contenu" button
2. Editing interface appears with HTML editor
3. Optionally click "Activer l'IA" for AI assistance
4. Make changes in editor or via AI chat
5. Click "Sauvegarder" to save and return to standard mode

### AI-Assisted Editing
1. Enter editing mode
2. Click "Activer l'IA"
3. Use chat interface to request modifications
4. See changes applied in real-time to editor
5. Save when satisfied with results

This implementation provides a much more intuitive and professional editing experience while maintaining all the powerful features of the original system.