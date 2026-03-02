import { SURVEYS, type Survey } from './surveys';

const CREATED_SURVEYS_KEY = 'pollapp:created-surveys';

export function getAllSurveys(): Survey[] {
  return [...SURVEYS, ...readCreatedSurveys()];
}

export function addSurvey(survey: Survey): void {
  const current = readCreatedSurveys();
  localStorage.setItem(CREATED_SURVEYS_KEY, JSON.stringify([...current, survey]));
}

export function nextSurveyId(): number {
  const ids = getAllSurveys().map((survey) => survey.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function readCreatedSurveys(): Survey[] {
  try {
    const raw = localStorage.getItem(CREATED_SURVEYS_KEY);
    return raw ? (JSON.parse(raw) as Survey[]) : [];
  } catch {
    return [];
  }
}
