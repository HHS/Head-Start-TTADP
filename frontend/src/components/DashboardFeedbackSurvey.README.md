# Dashboard Feedback Survey

A reusable React component for collecting user feedback on dashboard pages.

## Features

- ✅ Fixed position popup from bottom (20% viewport height)
- ✅ Light gray background (`$base-lighter` color)
- ✅ 1-10 rating scale with radio buttons
- ✅ Expandable comment section (300 character limit)
- ✅ Dismissible with 'X' button
- ✅ Per-page dismissal stored in localStorage
- ✅ Automatic dismissal after successful submission
- ✅ Fully accessible (ARIA labels, keyboard navigation)
- ✅ Responsive design

## Usage

### Basic Implementation

```jsx
import DashboardFeedbackSurvey from '../../components/DashboardFeedbackSurvey';
import { submitDashboardFeedback } from '../../fetchers/feedback';

function MyDashboard() {
  return (
    <div>
      {/* Your dashboard content */}
      
      <DashboardFeedbackSurvey
        pageId="my-dashboard"
        onSubmit={submitDashboardFeedback}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pageId` | string | Yes | Unique identifier for the dashboard page. Used for localStorage key. |
| `onSubmit` | function | Yes | Async function called when user submits feedback. Receives feedback object. |

### Feedback Object Structure

```javascript
{
  pageId: 'qa-dashboard',
  rating: 7,              // 1-10
  comment: 'Great dashboard!',
  timestamp: '2026-03-09T15:00:00.000Z',
  userId: 123             // Added by backend
}
```

## Integration Examples

### QA Dashboard
```jsx
// frontend/src/pages/QADashboard/index.js
import DashboardFeedbackSurvey from '../../components/DashboardFeedbackSurvey';
import { submitDashboardFeedback } from '../../fetchers/feedback';

export default function QADashboard() {
  return (
    <>
      {/* Dashboard content */}
      <DashboardFeedbackSurvey
        pageId="qa-dashboard"
        onSubmit={submitDashboardFeedback}
      />
    </>
  );
}
```

### Regional Dashboard
```jsx
<DashboardFeedbackSurvey
  pageId="regional-dashboard"
  onSubmit={submitDashboardFeedback}
/>
```

### Resources Dashboard
```jsx
<DashboardFeedbackSurvey
  pageId="resources-dashboard"
  onSubmit={submitDashboardFeedback}
/>
```

## Backend API

The component submits feedback to `/api/feedback/dashboard` endpoint.

**Request:**
```json
{
  "pageId": "qa-dashboard",
  "rating": 8,
  "comment": "Very helpful visualization",
  "timestamp": "2026-03-09T15:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "feedbackId": 12345
}
```

## Local Storage

The component uses localStorage to track dismissal per page:
- Key format: `dashboard-feedback-dismissed-{pageId}`
- Value: `"true"` when dismissed

Users can clear their browser's localStorage to see the survey again.

## Styling

The component uses project colors from `colors.scss`:
- Background: `$base-lighter` (#dfe1e2)
- Border: `$base-light`
- Text: `$base-darkest`
- Links: `$text-link`

Customize by editing `DashboardFeedbackSurvey.scss`.

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Testing

Run tests:
```bash
cd frontend
TZ=America/New_York yarn test --watchAll=false --testPathPattern=DashboardFeedbackSurvey
```

## Future Enhancements

- [ ] Add database persistence (currently logs to audit log)
- [ ] Create migration for `DashboardFeedback` table
- [ ] Add admin analytics dashboard to view feedback
- [ ] Support custom positioning options
- [ ] Add animation for show/hide transitions
