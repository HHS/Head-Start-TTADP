# FeedbackSurvey

A reusable React component that shows the admin-configured feedback survey for a page.

Surveys are created, closed, and reopened by admins at **Admin → Feedback surveys → Manage surveys**
(`/admin/feedback-surveys/manage`). Each survey targets one page, runs between a start and end date,
and asks one question, answered with Yes/No plus an optional comment. Questions are stored in their own
table and the popup and submit API already accept several, so adding multi-question surveys later only needs
admin create-form and validation changes.

## Behavior

- On mount, fetches `GET /api/feedback/survey/active?pageId=...`.
- Renders nothing when the page has no survey running today, or when the user already completed it.
- Shows a fixed "Was this page helpful?" button in the lower right; it opens a modal with the survey question.
- Submit is enabled once the question has a Yes/No answer. The comment is optional (140 character limit).
- After a successful submission the button shows "Submitted" briefly, then hides.

A page can only have one active survey at a time. Active surveys are closed automatically by a nightly
cron job (`runCloseExpiredFeedbackSurveysJob` in `src/lib/cron.js`) once their end date has passed.
Admins can instead check **Manually close survey**: the survey opens immediately, has no end date,
and stays open until an admin closes it.

## Usage

```jsx
import FeedbackSurvey from '../../components/FeedbackSurvey';
import { submitSurveyFeedback } from '../../fetchers/feedback';

<FeedbackSurvey pageId="qa-dashboard" onSubmit={submitSurveyFeedback} />
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pageId` | string | Yes | The page identifier. Must be one of the keys in `FEEDBACK_SURVEY_PAGES` (`src/constants.js`) so admins can target it. |
| `onSubmit` | function | Yes | Async function called with the submission payload. |

### Adding a new page

1. Add the page id and a display label to `FEEDBACK_SURVEY_PAGES` in `src/constants.js`.
2. Render `<FeedbackSurvey pageId="<id>" onSubmit={submitSurveyFeedback} />` on the page.

## Backend API

**Submit** `POST /api/feedback/survey`

```json
{
  "surveyId": 7,
  "responses": [
    { "questionId": 11, "response": "no", "comment": "Too many charts" }
  ],
  "timestamp": "2026-03-09T15:00:00.000Z"
}
```

Each answer is stored as its own `FeedbackSurveys` row linked to the survey and question.
Completion is tracked per user and survey in `FeedbackSurveyCompletions`, so a new survey on the
same page is shown to users again.

## Local debug flags

`frontend/src/utils/feedbackSurveyDebug.js` reads two localStorage flags:
- `ttahub:alwaysShowFeedbackSurvey` shows the survey even if the user completed it (still requires an active survey).
- `ttahub:forceSurveySubmit500` makes submission fail, to test the error state.

## Testing

```bash
cd frontend
TZ=America/New_York yarn test --watchAll=false --testPathPattern=FeedbackSurvey
```
