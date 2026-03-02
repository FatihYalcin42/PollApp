import { type RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { type Survey, type SurveyQuestion, type SurveyStats } from '../interfaces/survey.interface';
import { SURVEYS } from '../models/surveys.model';
import { supabase } from './supabase-client.service';

const CREATED_SURVEYS_KEY = 'pollapp:created-surveys';
const SURVEY_STATS_KEY = 'pollapp:survey-stats';
const SUPABASE_MIGRATION_KEY = 'pollapp:supabase-migration-v1';

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

type LocalSurveyStatsStore = Record<number, SurveyStats>;
type SurveyChangeListener = (surveys: Survey[]) => void;
type SurveyStatsChangeListener = (stats: SurveyStats) => void;

let hasBootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;
const surveyListeners = new Set<SurveyChangeListener>();
const surveyStatsListeners = new Map<number, Set<SurveyStatsChangeListener>>();
let surveysChannel: RealtimeChannel | null = null;
let surveyStatsChannel: RealtimeChannel | null = null;

export function subscribeToSurveyChanges(listener: SurveyChangeListener): () => void {
  surveyListeners.add(listener);
  ensureSurveyRealtimeChannel();
  return () => {
    surveyListeners.delete(listener);
    maybeRemoveSurveyRealtimeChannel();
  };
}

export function subscribeToSurveyStats(surveyId: number, listener: SurveyStatsChangeListener): () => void {
  const listeners = surveyStatsListeners.get(surveyId) ?? new Set<SurveyStatsChangeListener>();
  listeners.add(listener);
  surveyStatsListeners.set(surveyId, listeners);
  ensureSurveyStatsRealtimeChannel();
  return () => {
    const current = surveyStatsListeners.get(surveyId);
    if (!current) return;
    current.delete(listener);
    if (!current.size) surveyStatsListeners.delete(surveyId);
    maybeRemoveSurveyStatsRealtimeChannel();
  };
}

export async function getAllSurveys(): Promise<Survey[]> {
  await bootstrapStore();
  if (!supabase) return getLocalSurveys();
  const { data, error } = await supabase
    .from('surveys')
    .select('id, category, title, description, days_left, questions')
    .order('days_left', { ascending: true })
    .order('id', { ascending: true });
  if (error || !data) return getLocalSurveys();
  return data.map(mapDbSurveyToSurvey);
}

export async function addSurvey(survey: Survey): Promise<void> {
  await bootstrapStore();
  if (!supabase) {
    addLocalSurvey(survey);
    await notifySurveyListeners();
    return;
  }
  const { error } = await supabase.from('surveys').upsert(mapSurveyToDb(survey), { onConflict: 'id' });
  if (error) addLocalSurvey(survey);
  await notifySurveyListeners();
}

export async function nextSurveyId(): Promise<number> {
  const ids = (await getAllSurveys()).map((survey) => survey.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export async function getSurveyStats(surveyId: number): Promise<SurveyStats> {
  await bootstrapStore();
  if (!supabase) return readLocalSurveyStats(surveyId);
  const { data, error } = await supabase
    .from('survey_stats')
    .select('survey_id, total_responses, counts')
    .eq('survey_id', surveyId)
    .maybeSingle();
  if (error || !data) return readLocalSurveyStats(surveyId);
  return mapDbStatsToSurveyStats(data);
}

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

async function bootstrapStore(): Promise<void> {
  if (hasBootstrapped) return;
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }
  bootstrapPromise = (async () => {
    if (supabase) await migrateLocalDataToSupabase();
    hasBootstrapped = true;
  })();
  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

async function migrateLocalDataToSupabase(): Promise<void> {
  if (!supabase || !canUseLocalStorage()) return;
  if (localStorage.getItem(SUPABASE_MIGRATION_KEY) === '1') return;
  const surveys = getLocalSurveys().map(mapSurveyToDb);
  const stats = mapLocalStatsToDb(readLocalSurveyStatsStore());
  const surveyResult = await upsertSurveys(surveys);
  if (!surveyResult) return;
  const statsResult = await upsertStats(stats);
  if (!statsResult) return;
  clearLocalSurveyData();
  localStorage.setItem(SUPABASE_MIGRATION_KEY, '1');
}

async function upsertSurveys(rows: DbSurveyRow[]): Promise<boolean> {
  if (!supabase || !rows.length) return true;
  const { error } = await supabase.from('surveys').upsert(rows, { onConflict: 'id' });
  return !error;
}

async function upsertStats(rows: DbStatsRow[]): Promise<boolean> {
  if (!supabase || !rows.length) return true;
  const { error } = await supabase.from('survey_stats').upsert(rows, { onConflict: 'survey_id' });
  return !error;
}

async function persistSurveyStats(surveyId: number, stats: SurveyStats): Promise<void> {
  await bootstrapStore();
  if (!supabase) {
    writeLocalSurveyStats(surveyId, stats);
    await notifySurveyStatsListeners(surveyId);
    return;
  }
  const payload = mapSurveyStatsToDb(surveyId, stats);
  const { error } = await supabase.from('survey_stats').upsert(payload, { onConflict: 'survey_id' });
  if (error) writeLocalSurveyStats(surveyId, stats);
  await notifySurveyStatsListeners(surveyId);
}

async function notifySurveyListeners(): Promise<void> {
  if (!surveyListeners.size) return;
  const surveys = await getAllSurveys();
  surveyListeners.forEach((listener) => listener(surveys));
}

async function notifySurveyStatsListeners(surveyId: number): Promise<void> {
  const listeners = surveyStatsListeners.get(surveyId);
  if (!listeners?.size) return;
  const stats = await getSurveyStats(surveyId);
  listeners.forEach((listener) => listener(stats));
}

async function notifyAllSurveyStatsListeners(): Promise<void> {
  const surveyIds = [...surveyStatsListeners.keys()];
  await Promise.all(surveyIds.map((surveyId) => notifySurveyStatsListeners(surveyId)));
}

function ensureSurveyRealtimeChannel(): void {
  if (!supabase || surveysChannel || !surveyListeners.size) return;
  surveysChannel = supabase
    .channel('surveys-changes-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
      void notifySurveyListeners();
    })
    .subscribe();
}

function maybeRemoveSurveyRealtimeChannel(): void {
  if (!supabase || surveyListeners.size || !surveysChannel) return;
  void supabase.removeChannel(surveysChannel);
  surveysChannel = null;
}

function ensureSurveyStatsRealtimeChannel(): void {
  if (!supabase || surveyStatsChannel || !hasSurveyStatsListeners()) return;
  surveyStatsChannel = supabase
    .channel('survey-stats-changes-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_stats' }, (payload) => {
      const surveyId = getChangedSurveyId(payload);
      if (surveyId === null) {
        void notifyAllSurveyStatsListeners();
        return;
      }
      void notifySurveyStatsListeners(surveyId);
    })
    .subscribe();
}

function maybeRemoveSurveyStatsRealtimeChannel(): void {
  if (!supabase || hasSurveyStatsListeners() || !surveyStatsChannel) return;
  void supabase.removeChannel(surveyStatsChannel);
  surveyStatsChannel = null;
}

function hasSurveyStatsListeners(): boolean {
  return surveyStatsListeners.size > 0;
}

function getChangedSurveyId(payload: RealtimePostgresChangesPayload<Record<string, unknown>>): number | null {
  const value = readPayloadValue(payload.new, 'survey_id') ?? readPayloadValue(payload.old, 'survey_id');
  return parseNumericId(value);
}

function readPayloadValue(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== 'object') return null;
  return (payload as Record<string, unknown>)[key];
}

function parseNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapDbSurveyToSurvey(row: DbSurveyRow): Survey {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    daysLeft: row.days_left,
    questions: row.questions,
  };
}

function mapSurveyToDb(survey: Survey): DbSurveyRow {
  return {
    id: survey.id,
    category: survey.category,
    title: survey.title,
    description: survey.description,
    days_left: survey.daysLeft,
    questions: survey.questions,
  };
}

function mapDbStatsToSurveyStats(row: DbStatsRow): SurveyStats {
  return {
    total: row.total_responses,
    counts: normalizeStatsCounts(row.counts),
  };
}

function mapSurveyStatsToDb(surveyId: number, stats: SurveyStats): DbStatsRow {
  return {
    survey_id: surveyId,
    total_responses: stats.total,
    counts: toDbStatsCounts(stats.counts),
  };
}

function mapLocalStatsToDb(store: LocalSurveyStatsStore): DbStatsRow[] {
  return Object.entries(store).map(([surveyId, stats]) => mapSurveyStatsToDb(Number(surveyId), stats));
}

function applySurveyVote(
  current: SurveyStats,
  questions: SurveyQuestion[],
  selectedAnswers: Record<number, number[]>,
): SurveyStats {
  const counts = cloneStatsCounts(current.counts);
  questions.forEach((question) => addVotes(counts, selectedAnswers, question));
  return { total: current.total + 1, counts };
}

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

function incrementVote(values: number[], index: number): void {
  if (index < 0 || index >= values.length) return;
  values[index] += 1;
}

function cloneStatsCounts(counts: Record<number, number[]>): Record<number, number[]> {
  return Object.fromEntries(Object.entries(counts).map(([key, values]) => [Number(key), [...values]])) as Record<
    number,
    number[]
  >;
}

function normalizeStatsCounts(counts: Record<string, number[]>): Record<number, number[]> {
  return Object.fromEntries(Object.entries(counts).map(([key, values]) => [Number(key), values])) as Record<
    number,
    number[]
  >;
}

function toDbStatsCounts(counts: Record<number, number[]>): Record<string, number[]> {
  return Object.fromEntries(Object.entries(counts).map(([key, values]) => [String(key), values]));
}

function getLocalSurveys(): Survey[] {
  return [...SURVEYS, ...readCreatedSurveys()];
}

function addLocalSurvey(survey: Survey): void {
  const current = readCreatedSurveys();
  localStorage.setItem(CREATED_SURVEYS_KEY, JSON.stringify([...current, survey]));
}

function readCreatedSurveys(): Survey[] {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = localStorage.getItem(CREATED_SURVEYS_KEY);
    return raw ? (JSON.parse(raw) as Survey[]) : [];
  } catch {
    return [];
  }
}

function readLocalSurveyStats(surveyId: number): SurveyStats {
  return readLocalSurveyStatsStore()[surveyId] ?? { total: 0, counts: {} };
}

function writeLocalSurveyStats(surveyId: number, stats: SurveyStats): void {
  const store = readLocalSurveyStatsStore();
  store[surveyId] = stats;
  localStorage.setItem(SURVEY_STATS_KEY, JSON.stringify(store));
}

function readLocalSurveyStatsStore(): LocalSurveyStatsStore {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(SURVEY_STATS_KEY);
    if (!raw) return {};
    return normalizeLocalSurveyStats(JSON.parse(raw) as Record<string, SurveyStats>);
  } catch {
    return {};
  }
}

function normalizeLocalSurveyStats(store: Record<string, SurveyStats>): LocalSurveyStatsStore {
  return Object.fromEntries(Object.entries(store).map(([key, value]) => [Number(key), value])) as LocalSurveyStatsStore;
}

function clearLocalSurveyData(): void {
  localStorage.removeItem(CREATED_SURVEYS_KEY);
  localStorage.removeItem(SURVEY_STATS_KEY);
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}
