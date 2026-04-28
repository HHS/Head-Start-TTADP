export const ALWAYS_SHOW_SURVEY_KEY = 'ttahub:alwaysShowFeedbackSurvey';
export const FORCE_SURVEY_SUBMIT_500_KEY = 'ttahub:forceSurveySubmit500';

export function getFeedbackSurveyDebugFlag(key) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(key) === 'true';
  } catch (error) {
    return false;
  }
}

export function setFeedbackSurveyDebugFlag(key, enabled) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(key, 'true');
      return;
    }

    window.localStorage.removeItem(key);
  } catch (error) {
    // No-op: debug toggles should never block app behavior.
  }
}
