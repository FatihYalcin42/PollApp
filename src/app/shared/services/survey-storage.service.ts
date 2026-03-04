import { type RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { type Survey, type SurveyQuestion, type SurveyStats } from '../interfaces/survey.interface';
import { normalizeSurveyCategory } from '../constants/survey-categories';
import { supabase } from './supabase-client.service';

type DbSurveyRow = {
  id: number;
  category: string;
  title: string;
  description: string;
  days_left: number;
  questions: SurveyQuestion[];
};

type DbStatsRow = {
  survey_id: number;
  total_responses: number;
  counts: Record<string, number[]>;
};

type SurveyChangeListener = (surveys: Survey[]) => void;
type SurveyStatsChangeListener = (stats: SurveyStats) => void;

const SURVEY_LISTENERS = new Set<SurveyChangeListener>();
const SURVEY_STATS_LISTENERS = new Map<number, Set<SurveyStatsChangeListener>>();
let SURVEYS_CHANNEL: RealtimeChannel | null = null;
let SURVEY_STATS_CHANNEL: RealtimeChannel | null = null;

/** Registers a callback for live survey list updates. */
export function subscribeToSurveyChanges(listener: SurveyChangeListener): () => void {
  SURVEY_LISTENERS.add(listener);
  ensureSurveyRealtimeChannel();
  return () => {
    SURVEY_LISTENERS.delete(listener);
    maybeRemoveSurveyRealtimeChannel();
  };
}

/** Registers a callback for live stats updates of a single survey. */
export function subscribeToSurveyStats(surveyId: number, listener: SurveyStatsChangeListener): () => void {
  const listeners = SURVEY_STATS_LISTENERS.get(surveyId) ?? new Set<SurveyStatsChangeListener>();
  listeners.add(listener);
  SURVEY_STATS_LISTENERS.set(surveyId, listeners);
  ensureSurveyStatsRealtimeChannel();
  return () => unsubscribeSurveyStatsListener(surveyId, listener);
}

/** Returns all surveys from Supabase ordered by deadline and id. */
export async function getAllSurveys(): Promise<Survey[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('surveys')
    .select('id, category, title, description, days_left, questions')
    .order('days_left', { ascending: true })
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data.map(mapDbSurveyToSurvey);
}

/** Creates or updates one survey in Supabase. */
export async function addSurvey(survey: Survey): Promise<void> {
  if (!supabase) return;
  const payload = mapSurveyToDb(survey);
  const { error } = await supabase.from('surveys').upsert(payload, { onConflict: 'id' });
  if (error) return;
  await notifySurveyListeners();
}

/** Calculates the next integer survey id from current database rows. */
export async function nextSurveyId(): Promise<number> {
  const ids = (await getAllSurveys()).map((survey) => survey.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

/** Returns vote stats for one survey id from Supabase. */
export async function getSurveyStats(surveyId: number): Promise<SurveyStats> {
  if (!supabase) return createEmptySurveyStats();
  const { data, error } = await supabase
    .from('survey_stats')
    .select('survey_id, total_responses, counts')
    .eq('survey_id', surveyId)
    .maybeSingle();
  if (error || !data) return createEmptySurveyStats();
  return mapDbStatsToSurveyStats(data);
}

/** Persists one submitted vote set and returns the latest stats snapshot. */
export async function saveSurveyResponse(
  surveyId: number,
  questions: SurveyQuestion[],
  selectedAnswers: Record<number, number[]>,
): Promise<SurveyStats> {
  const current = await getSurveyStats(surveyId);
  const next = applySurveyVote(current, questions, selectedAnswers);
  await persistSurveyStats(surveyId, next);
  return next;
}

/**
 * Writes the latest stats snapshot for one survey to Supabase.
 * @param surveyId Survey id.
 * @param stats Stats snapshot.
 */
async function persistSurveyStats(surveyId: number, stats: SurveyStats): Promise<void> {
  if (!supabase) return;
  const payload = mapSurveyStatsToDb(surveyId, stats);
  const { error } = await supabase.from('survey_stats').upsert(payload, { onConflict: 'survey_id' });
  if (error) return;
  await notifySurveyStatsListeners(surveyId);
}

/** Reloads all surveys and emits them to active list listeners. */
async function notifySurveyListeners(): Promise<void> {
  if (!SURVEY_LISTENERS.size) return;
  const surveys = await getAllSurveys();
  SURVEY_LISTENERS.forEach((listener) => listener(surveys));
}

/**
 * Reloads one survey stats row and emits it to listeners of that survey id.
 * @param surveyId Survey id.
 */
async function notifySurveyStatsListeners(surveyId: number): Promise<void> {
  const listeners = SURVEY_STATS_LISTENERS.get(surveyId);
  if (!listeners?.size) return;
  const stats = await getSurveyStats(surveyId);
  listeners.forEach((listener) => listener(stats));
}

/** Notifies all registered survey stats listeners across all survey ids. */
async function notifyAllSurveyStatsListeners(): Promise<void> {
  const surveyIds = [...SURVEY_STATS_LISTENERS.keys()];
  await Promise.all(surveyIds.map((surveyId) => notifySurveyStatsListeners(surveyId)));
}

/** Creates the realtime channel for survey table changes when needed. */
function ensureSurveyRealtimeChannel(): void {
  if (!supabase || SURVEYS_CHANNEL || !SURVEY_LISTENERS.size) return;
  SURVEYS_CHANNEL = supabase
    .channel('surveys-changes-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
      void notifySurveyListeners();
    })
    .subscribe();
}

/** Removes the survey realtime channel if no survey listeners remain. */
function maybeRemoveSurveyRealtimeChannel(): void {
  if (!supabase || SURVEY_LISTENERS.size || !SURVEYS_CHANNEL) return;
  void supabase.removeChannel(SURVEYS_CHANNEL);
  SURVEYS_CHANNEL = null;
}

/** Creates the realtime channel for survey stats changes when needed. */
function ensureSurveyStatsRealtimeChannel(): void {
  if (!supabase || SURVEY_STATS_CHANNEL || !hasSurveyStatsListeners()) return;
  SURVEY_STATS_CHANNEL = supabase
    .channel('survey-stats-changes-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_stats' }, (payload) => {
      handleSurveyStatsRealtimePayload(payload);
    })
    .subscribe();
}

/**
 * Routes one realtime stats payload to either one survey listener set or all sets.
 * @param payload Realtime postgres change payload.
 */
function handleSurveyStatsRealtimePayload(payload: RealtimePostgresChangesPayload<Record<string, unknown>>): void {
  const surveyId = getChangedSurveyId(payload);
  if (surveyId === null) {
    void notifyAllSurveyStatsListeners();
    return;
  }
  void notifySurveyStatsListeners(surveyId);
}

/** Removes the survey stats realtime channel if no listeners remain. */
function maybeRemoveSurveyStatsRealtimeChannel(): void {
  if (!supabase || hasSurveyStatsListeners() || !SURVEY_STATS_CHANNEL) return;
  void supabase.removeChannel(SURVEY_STATS_CHANNEL);
  SURVEY_STATS_CHANNEL = null;
}

/** @returns True when at least one survey stats listener is registered. */
function hasSurveyStatsListeners(): boolean {
  return SURVEY_STATS_LISTENERS.size > 0;
}

/**
 * Unregisters one listener from one survey stats channel.
 * @param surveyId Survey id.
 * @param listener Listener callback.
 */
function unsubscribeSurveyStatsListener(surveyId: number, listener: SurveyStatsChangeListener): void {
  const listeners = SURVEY_STATS_LISTENERS.get(surveyId);
  if (!listeners) return;
  listeners.delete(listener);
  if (!listeners.size) SURVEY_STATS_LISTENERS.delete(surveyId);
  maybeRemoveSurveyStatsRealtimeChannel();
}

/**
 * Extracts survey id from realtime payload new/old record.
 * @param payload Realtime postgres change payload.
 * @returns Parsed survey id or null.
 */
function getChangedSurveyId(payload: RealtimePostgresChangesPayload<Record<string, unknown>>): number | null {
  const value = readPayloadValue(payload.new, 'survey_id') ?? readPayloadValue(payload.old, 'survey_id');
  return parseNumericId(value);
}

/**
 * Safely reads one value from an unknown payload object.
 * @param payload Unknown payload object.
 * @param key Field key.
 * @returns Field value or null.
 */
function readPayloadValue(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== 'object') return null;
  return (payload as Record<string, unknown>)[key];
}

/**
 * Parses a numeric id from unknown input.
 * @param value Unknown payload value.
 * @returns Number id or null.
 */
function parseNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Maps one database survey row to app survey model.
 * @param row Database survey row.
 * @returns App survey object.
 */
function mapDbSurveyToSurvey(row: DbSurveyRow): Survey {
  return {
    id: row.id,
    category: normalizeSurveyCategory(row.category),
    title: row.title,
    description: row.description,
    daysLeft: row.days_left,
    questions: row.questions,
  };
}

/**
 * Maps one app survey object to database payload shape.
 * @param survey App survey object.
 * @returns Database survey row payload.
 */
function mapSurveyToDb(survey: Survey): DbSurveyRow {
  return {
    id: survey.id,
    category: normalizeSurveyCategory(survey.category),
    title: survey.title,
    description: survey.description,
    days_left: survey.daysLeft,
    questions: survey.questions,
  };
}

/**
 * Maps one database stats row to app stats object.
 * @param row Database stats row.
 * @returns App survey stats.
 */
function mapDbStatsToSurveyStats(row: DbStatsRow): SurveyStats {
  return {
    total: row.total_responses,
    counts: normalizeStatsCounts(row.counts),
  };
}

/**
 * Maps app stats object to database stats payload.
 * @param surveyId Survey id.
 * @param stats App survey stats.
 * @returns Database stats row payload.
 */
function mapSurveyStatsToDb(surveyId: number, stats: SurveyStats): DbStatsRow {
  return {
    survey_id: surveyId,
    total_responses: stats.total,
    counts: toDbStatsCounts(stats.counts),
  };
}

/**
 * Applies one submitted vote set to current stats.
 * @param current Current stats snapshot.
 * @param questions Survey questions.
 * @param selectedAnswers Selected answer indices per question id.
 * @returns Updated stats snapshot.
 */
function applySurveyVote(
  current: SurveyStats,
  questions: SurveyQuestion[],
  selectedAnswers: Record<number, number[]>,
): SurveyStats {
  const counts = cloneStatsCounts(current.counts);
  questions.forEach((question) => addVotes(counts, selectedAnswers, question));
  return { total: current.total + 1, counts };
}

/**
 * Adds selected votes for one question into stats counts.
 * @param counts Mutable stats counts.
 * @param selectedAnswers Selected answer indices per question id.
 * @param question Survey question.
 */
function addVotes(
  counts: Record<number, number[]>,
  selectedAnswers: Record<number, number[]>,
  question: SurveyQuestion,
): void {
  const selected = selectedAnswers[question.id] ?? [];
  const values = counts[question.id] ?? Array(question.answers.length).fill(0);
  selected.forEach((index) => incrementVote(values, index));
  counts[question.id] = values;
}

/**
 * Increments one answer index in a vote array.
 * @param values Vote array.
 * @param index Answer index.
 */
function incrementVote(values: number[], index: number): void {
  if (index < 0 || index >= values.length) return;
  values[index] += 1;
}

/**
 * Deep clones stats counts object for immutable updates.
 * @param counts Stats counts object.
 * @returns Cloned stats counts.
 */
function cloneStatsCounts(counts: Record<number, number[]>): Record<number, number[]> {
  return Object.fromEntries(Object.entries(counts).map(([key, values]) => [Number(key), [...values]])) as Record<
    number,
    number[]
  >;
}

/**
 * Normalizes database jsonb keys to numeric question ids.
 * @param counts Database stats counts object.
 * @returns Normalized app stats counts.
 */
function normalizeStatsCounts(counts: Record<string, number[]>): Record<number, number[]> {
  return Object.fromEntries(Object.entries(counts).map(([key, values]) => [Number(key), values])) as Record<
    number,
    number[]
  >;
}

/**
 * Converts numeric question id keys to string keys for jsonb storage.
 * @param counts App stats counts object.
 * @returns Database-ready json object.
 */
function toDbStatsCounts(counts: Record<number, number[]>): Record<string, number[]> {
  return Object.fromEntries(Object.entries(counts).map(([key, values]) => [String(key), values]));
}

/** @returns Empty stats object with no responses and no vote counts. */
function createEmptySurveyStats(): SurveyStats {
  return {
    total: 0,
    counts: {},
  };
}
