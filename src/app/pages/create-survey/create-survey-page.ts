import { Component, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { addSurvey, nextSurveyId } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';

const SURVEY_SETTINGS_KEY = 'pollapp:survey-settings';
const SURVEY_CREATED_OVERLAY_KEY = 'pollapp:survey-created-overlay';
type SurveySettings = { allowMultipleAnswers?: boolean; surveyTitle?: string };
type QuestionItem = {
  id: number;
  renderVersion: number;
  allowMultipleAnswers: boolean;
  answerFieldIndexes: number[];
  prompt: string;
  answers: Record<number, string>;
};

@Component({
  selector: 'app-create-survey-page',
  imports: [RouterLink],
  templateUrl: './create-survey-page.html',
  styleUrl: './create-survey-page.scss',
})
export class CreateSurveyPage {
  protected isCategoryDropdownOpen = false;
  protected selectedCategory = 'Choose categorie';
  protected surveyTitle = '';
  protected surveyDescription = '';
  protected endDate = '';
  protected showValidationErrors = false;
  protected readonly categories = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];
  protected readonly maxAnswerFields = 6;
  protected readonly maxQuestions = 6;
  protected questions: QuestionItem[] = [
    {
      id: 1,
      renderVersion: 0,
      allowMultipleAnswers: false,
      answerFieldIndexes: [0, 1],
      prompt: '',
      answers: { 0: '', 1: '' },
    },
  ];

  constructor(private readonly router: Router) {
    this.questions[0].allowMultipleAnswers = this.readAllowMultipleAnswers();
  }

  protected toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  protected closeCategoryDropdownOnOutsideClick(event: MouseEvent): void {
    if (!this.isCategoryDropdownOpen) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.category-dropdown')) this.isCategoryDropdownOpen = false;
  }

  protected selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  protected clearField(control: HTMLInputElement | HTMLTextAreaElement): void {
    control.value = '';
  }

  protected onAllowMultipleAnswersChange(questionId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.questions = this.questions.map((question) =>
      question.id === questionId
        ? { ...question, allowMultipleAnswers: input.checked }
        : question,
    );
  }

  protected limitInputLength(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.slice(0, 60);
  }

  protected limitDescriptionLength(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.value = textarea.value.slice(0, 160);
  }

  protected addQuestion(): void {
    if (this.questions.length >= this.maxQuestions) return;
    const nextId = this.questions.length
      ? Math.max(...this.questions.map((question) => question.id)) + 1
      : 1;
    this.questions = [
      ...this.questions,
      {
        id: nextId,
        renderVersion: 0,
        allowMultipleAnswers: false,
        answerFieldIndexes: [0, 1],
        prompt: '',
        answers: { 0: '', 1: '' },
      },
    ];
  }

  protected handleQuestionDelete(questionIndex: number): void {
    if (questionIndex === 0) {
      const firstQuestion = this.questions[0];
      if (!firstQuestion) return;
      const clearedAnswers = Object.fromEntries(
        firstQuestion.answerFieldIndexes.map((index) => [index, '']),
      ) as Record<number, string>;
      this.questions = [
        {
          ...firstQuestion,
          prompt: '',
          answers: clearedAnswers,
          renderVersion: firstQuestion.renderVersion + 1,
        },
        ...this.questions.slice(1),
      ];
      return;
    }
    this.questions = this.questions.filter((_, index) => index !== questionIndex);
  }

  protected addAnswerField(questionId: number): void {
    this.questions = this.questions.map((question) => {
      if (question.id !== questionId) return question;
      if (question.answerFieldIndexes.length >= this.maxAnswerFields) return question;
      const nextIndex = question.answerFieldIndexes.length
        ? Math.max(...question.answerFieldIndexes) + 1
        : 0;
      return {
        ...question,
        answerFieldIndexes: [...question.answerFieldIndexes, nextIndex],
        answers: { ...question.answers, [nextIndex]: '' },
      };
    });
  }

  protected removeAnswerField(questionId: number, answerFieldIndex: number): void {
    this.questions = this.questions.map((question) => {
      if (question.id !== questionId) return question;
      const answers = { ...question.answers };
      delete answers[answerFieldIndex];
      return {
        ...question,
        answerFieldIndexes: question.answerFieldIndexes.filter((index) => index !== answerFieldIndex),
        answers,
      };
    });
  }

  protected publishSurvey(): void {
    this.showValidationErrors = true;
    if (!this.hasValidRequiredFields()) return;

    addSurvey(this.buildSurvey());
    localStorage.setItem(SURVEY_CREATED_OVERLAY_KEY, '1');
    this.persistSurveySettings(this.questions[0]?.allowMultipleAnswers ?? false, this.surveyTitle);
    void this.router.navigate(['/']);
  }

  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected updateSurveyTitle(value: string): void {
    this.surveyTitle = value.trim();
  }

  protected updateSurveyDescription(value: string): void {
    this.surveyDescription = value;
  }

  protected updateEndDate(value: string): void {
    this.endDate = value.trim();
  }

  protected updateQuestionPrompt(questionId: number, value: string): void {
    this.questions = this.questions.map((question) =>
      question.id === questionId ? { ...question, prompt: value } : question,
    );
  }

  protected updateAnswerText(questionId: number, answerFieldIndex: number, value: string): void {
    this.questions = this.questions.map((question) =>
      question.id === questionId
        ? { ...question, answers: { ...question.answers, [answerFieldIndex]: value } }
        : question,
    );
  }

  protected isSurveyTitleInvalid(): boolean {
    return this.showValidationErrors && !this.surveyTitle.trim();
  }

  protected isQuestionPromptInvalid(question: QuestionItem): boolean {
    return this.showValidationErrors && !this.isQuestionPromptFilled(question);
  }

  protected isAnswerInputInvalid(question: QuestionItem, answerFieldIndex: number): boolean {
    if (!this.showValidationErrors) return false;
    return !(question.answers[answerFieldIndex] ?? '').trim();
  }

  protected isQuestionAnswersInvalid(question: QuestionItem): boolean {
    return this.showValidationErrors && !this.hasValidAnswerOptions(question);
  }

  protected get formattedEndDate(): string {
    if (!this.endDate) return '--.--.----';
    const [year, month, day] = this.endDate.split('-');
    return day && month && year ? `${day}.${month}.${year}` : '--.--.----';
  }

  private buildSurvey(): Survey {
    return {
      id: nextSurveyId(),
      category: this.selectedCategory === 'Choose categorie' ? 'Uncategorized' : this.selectedCategory,
      title: this.surveyTitle,
      description: this.surveyDescription.trim() || 'This survey was created in PollApp.',
      daysLeft: this.getDaysLeft(),
      questions: this.getSurveyQuestions(),
    };
  }

  private getDaysLeft(): number {
    if (!this.endDate) return 30;
    const end = new Date(`${this.endDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / 86400000);
  }

  private getSurveyQuestions() {
    return this.questions.map((question, index) => ({
      id: index + 1,
      prompt: question.prompt.trim(),
      hint: question.allowMultipleAnswers ? 'More than one answers are possible.' : '',
      allowMultiple: question.allowMultipleAnswers,
      answers: this.getSurveyAnswers(question.answerFieldIndexes, question.answers),
    }));
  }

  private getSurveyAnswers(indexes: number[], answers: Record<number, string>): string[] {
    return indexes.map((idx) => answers[idx]?.trim() ?? '');
  }

  private readAllowMultipleAnswers(): boolean {
    try {
      const raw = localStorage.getItem(SURVEY_SETTINGS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SurveySettings;
      return !!parsed.allowMultipleAnswers;
    } catch {
      return false;
    }
  }

  private persistSurveySettings(allowMultipleAnswers: boolean, surveyTitle: string): void {
    const title = surveyTitle || 'Untitled survey';
    localStorage.setItem(
      SURVEY_SETTINGS_KEY,
      JSON.stringify({ allowMultipleAnswers, surveyTitle: title }),
    );
  }

  private hasValidRequiredFields(): boolean {
    if (!this.surveyTitle.trim()) return false;
    return this.questions.every(
      (question) => this.isQuestionPromptFilled(question) && this.hasValidAnswerOptions(question),
    );
  }

  private isQuestionPromptFilled(question: QuestionItem): boolean {
    return question.prompt.trim().length > 0;
  }

  private hasValidAnswerOptions(question: QuestionItem): boolean {
    const answerValues = question.answerFieldIndexes.map(
      (answerFieldIndex) => (question.answers[answerFieldIndex] ?? '').trim(),
    );
    return answerValues.length >= 2 && answerValues.every((value) => value.length > 0);
  }
}
