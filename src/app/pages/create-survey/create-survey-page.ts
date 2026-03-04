import { DOCUMENT } from '@angular/common';
import { Component, EventEmitter, HostBinding, HostListener, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { addSurvey, nextSurveyId } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';
import { CATEGORY_PLACEHOLDER_LABEL, SURVEY_CATEGORIES } from '../../shared/constants/survey-categories';

const MAX_INPUT_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;
const DEFAULT_DAYS_LEFT = 30;
const MS_PER_DAY = 86400000;
const BODY_SCROLL_LOCK_CLASS = 'overlay-scroll-lock';
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
  imports: [],
  templateUrl: './create-survey-page.html',
  styleUrl: './create-survey-page.scss',
})
export class CreateSurveyPage implements OnChanges, OnDestroy {
  @Input() isDialog = false;
  @Output() closeRequested = new EventEmitter<void>();
  @Output() surveyPublished = new EventEmitter<void>();
  protected isCategoryDropdownOpen = false;
  protected selectedCategory = CATEGORY_PLACEHOLDER_LABEL;
  protected readonly minEndDate = this.getTodayIsoDate();
  protected surveyTitle = '';
  protected surveyDescription = '';
  protected endDate = '';
  protected showValidationErrors = false;
  protected readonly categories = SURVEY_CATEGORIES;
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

  @HostBinding('class.create-survey-dialog-mode')
  protected get isCreateSurveyDialogMode(): boolean {
    return this.isDialog;
  }

  private hasBodyScrollLock = false;

  constructor(
    private readonly router: Router,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  /**
   * Applies or removes body scroll lock when dialog mode input changes.
   * @param changes Component input changes.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isDialog']) return;
    this.updateBodyScrollLock();
  }

  /** Removes dialog body scroll lock during component teardown. */
  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  /** Closes create survey view either as dialog or via route navigation. */
  protected closeCreateSurvey(): void {
    if (this.isDialog) {
      this.closeRequested.emit();
      return;
    }
    void this.router.navigate(['/']);
  }

  /**
   * Closes the dialog when user clicks on the backdrop area.
   * @param event Native click event.
   */
  protected handleBackdropClick(event: MouseEvent): void {
    if (!this.isDialog) return;
    if (event.target !== event.currentTarget) return;
    this.closeCreateSurvey();
  }

  /** Synchronizes body scrolling state with current dialog mode. */
  private updateBodyScrollLock(): void {
    if (this.isDialog) {
      this.lockBodyScroll();
      return;
    }
    this.unlockBodyScroll();
  }

  /** Locks background page scrolling while dialog is visible. */
  private lockBodyScroll(): void {
    if (this.hasBodyScrollLock) return;
    this.document.body.classList.add(BODY_SCROLL_LOCK_CLASS);
    this.hasBodyScrollLock = true;
  }

  /** Restores background page scrolling after dialog close. */
  private unlockBodyScroll(): void {
    if (!this.hasBodyScrollLock) return;
    this.document.body.classList.remove(BODY_SCROLL_LOCK_CLASS);
    this.hasBodyScrollLock = false;
  }

  /** Toggles the category dropdown state. */
  protected toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  /** Closes dialog on Escape key while running in dialog mode. */
  @HostListener('document:keydown.escape')
  protected closeDialogOnEscape(): void {
    if (!this.isDialog) return;
    this.closeCreateSurvey();
  }

  /**
   * Closes the category dropdown when the click is outside of it.
   * @param event Native click event.
   */
  @HostListener('document:click', ['$event'])
  protected closeCategoryDropdownOnOutsideClick(event: MouseEvent): void {
    if (!this.isCategoryDropdownOpen) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.category-dropdown')) this.isCategoryDropdownOpen = false;
  }

  /**
   * Selects a category and closes the dropdown.
   * @param category Selected category label.
   */
  protected selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  /**
   * Clears a form field value.
   * @param control Input or textarea element.
   */
  protected clearField(control: HTMLInputElement | HTMLTextAreaElement): void {
    control.value = '';
  }

  /**
   * Updates whether a question allows multiple answers.
   * @param questionId Target question id.
   * @param event Checkbox change event.
   */
  protected onAllowMultipleAnswersChange(questionId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.questions = this.questions.map((question) =>
      question.id === questionId
        ? { ...question, allowMultipleAnswers: input.checked }
        : question,
    );
  }

  /**
   * Limits input fields to 60 characters.
   * @param event Input event.
   */
  protected limitInputLength(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.slice(0, MAX_INPUT_LENGTH);
  }

  /**
   * Limits description fields to 160 characters.
   * @param event Input event.
   */
  protected limitDescriptionLength(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.value = textarea.value.slice(0, MAX_DESCRIPTION_LENGTH);
  }

  /** Adds a new question until the configured max is reached. */
  protected addQuestion(): void {
    if (this.questions.length >= this.maxQuestions) return;
    const nextId = this.getNextQuestionId();
    this.questions = [...this.questions, this.createQuestionItem(nextId)];
  }

  /**
   * Deletes a question by index or resets the first question.
   * @param questionIndex Index of the question in the list.
   */
  protected handleQuestionDelete(questionIndex: number): void {
    if (questionIndex !== 0) {
      this.questions = this.questions.filter((_, index) => index !== questionIndex);
      return;
    }
    this.resetFirstQuestion();
  }

  /**
   * Adds one answer field to a question.
   * @param questionId Target question id.
   */
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

  /**
   * Removes an answer field from a question.
   * @param questionId Target question id.
   * @param answerFieldIndex Answer index to remove.
   */
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

  /** Validates and persists a new survey. */
  protected async publishSurvey(): Promise<void> {
    this.showValidationErrors = true;
    if (!this.hasValidRequiredFields()) return;
    const survey = await this.buildSurvey();
    await addSurvey(survey);
    this.surveyPublished.emit();
    this.closeCreateSurvey();
  }

  /**
   * Converts an answer index to alphabetical label.
   * @param index Zero-based answer index.
   * @returns Letter label (A, B, C...).
   */
  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /**
   * Updates the survey title.
   * @param value Input value.
   */
  protected updateSurveyTitle(value: string): void {
    this.surveyTitle = value.trim();
  }

  /**
   * Updates the survey description.
   * @param value Input value.
   */
  protected updateSurveyDescription(value: string): void {
    this.surveyDescription = value;
  }

  /**
   * Updates the survey end date.
   * @param value Date value.
   */
  protected updateEndDate(value: string): void {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      this.endDate = '';
      return;
    }
    this.endDate = this.isPastDate(trimmedValue) ? this.minEndDate : trimmedValue;
  }

  /**
   * Updates the prompt text of a question.
   * @param questionId Target question id.
   * @param value Prompt value.
   */
  protected updateQuestionPrompt(questionId: number, value: string): void {
    this.questions = this.questions.map((question) =>
      question.id === questionId ? { ...question, prompt: value } : question,
    );
  }

  /**
   * Updates the text of one answer field.
   * @param questionId Target question id.
   * @param answerFieldIndex Target answer index.
   * @param value Answer text.
   */
  protected updateAnswerText(questionId: number, answerFieldIndex: number, value: string): void {
    this.questions = this.questions.map((question) =>
      question.id === questionId
        ? { ...question, answers: { ...question.answers, [answerFieldIndex]: value } }
        : question,
    );
  }

  /** @returns Whether the survey title is currently invalid. */
  protected isSurveyTitleInvalid(): boolean {
    return this.showValidationErrors && !this.surveyTitle.trim();
  }

  /**
   * Checks whether the prompt of a question is invalid.
   * @param question Question object.
   * @returns True when prompt is missing after validation was triggered.
   */
  protected isQuestionPromptInvalid(question: QuestionItem): boolean {
    return this.showValidationErrors && !this.isQuestionPromptFilled(question);
  }

  /**
   * Checks whether an answer input is invalid.
   * @param question Question object.
   * @param answerFieldIndex Answer index.
   * @returns True when answer text is empty after validation was triggered.
   */
  protected isAnswerInputInvalid(question: QuestionItem, answerFieldIndex: number): boolean {
    if (!this.showValidationErrors) return false;
    return !(question.answers[answerFieldIndex] ?? '').trim();
  }

  /**
   * Checks whether a question has invalid answer options.
   * @param question Question object.
   * @returns True when required answers are missing.
   */
  protected isQuestionAnswersInvalid(question: QuestionItem): boolean {
    return this.showValidationErrors && !this.hasValidAnswerOptions(question);
  }

  /** @returns Formatted dd.mm.yyyy date or a placeholder. */
  protected get formattedEndDate(): string {
    if (!this.endDate) return '--.--.----';
    const [year, month, day] = this.endDate.split('-');
    return day && month && year ? `${day}.${month}.${year}` : '--.--.----';
  }

  /** @returns Survey object ready for storage. */
  private async buildSurvey(): Promise<Survey> {
    return {
      id: await nextSurveyId(),
      category: this.resolveCategory(),
      title: this.surveyTitle,
      description: this.surveyDescription.trim(),
      daysLeft: this.getDaysLeft(),
      questions: this.getSurveyQuestions(),
    };
  }

  /** @returns Selected category or first shared category as fallback. */
  private resolveCategory(): string {
    if (this.selectedCategory !== CATEGORY_PLACEHOLDER_LABEL) return this.selectedCategory;
    return SURVEY_CATEGORIES[0];
  }

  /** @returns Days until survey end date. */
  private getDaysLeft(): number {
    if (!this.endDate) return DEFAULT_DAYS_LEFT;
    const end = new Date(`${this.endDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / MS_PER_DAY));
  }

  /** @returns True if the provided end date is before today. */
  private isPastDate(value: string): boolean {
    const selectedDate = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate.getTime() < today.getTime();
  }

  /** @returns Today's date in yyyy-mm-dd format for date inputs. */
  private getTodayIsoDate(): string {
    const today = new Date();
    const year = String(today.getFullYear());
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** @returns Normalized survey questions for persistence. */
  private getSurveyQuestions(): Survey['questions'] {
    return this.questions.map((question, index) => ({
      id: index + 1,
      prompt: question.prompt.trim(),
      hint: question.allowMultipleAnswers ? 'More than one answers are possible.' : '',
      allowMultiple: question.allowMultipleAnswers,
      answers: this.getSurveyAnswers(question.answerFieldIndexes, question.answers),
    }));
  }

  /**
   * Maps indexed answers to a string array.
   * @param indexes Ordered answer indexes.
   * @param answers Raw answer dictionary.
   * @returns Trimmed answer list.
   */
  private getSurveyAnswers(indexes: number[], answers: Record<number, string>): string[] {
    return indexes.map((idx) => answers[idx]?.trim() ?? '');
  }

  /** @returns Next unique question id for the current draft. */
  private getNextQuestionId(): number {
    if (!this.questions.length) return 1;
    return Math.max(...this.questions.map((question) => question.id)) + 1;
  }

  /**
   * Creates a new empty question object.
   * @param id Question id.
   * @returns New question item.
   */
  private createQuestionItem(id: number): QuestionItem {
    return {
      id,
      renderVersion: 0,
      allowMultipleAnswers: false,
      answerFieldIndexes: [0, 1],
      prompt: '',
      answers: { 0: '', 1: '' },
    };
  }

  /** Resets the first question fields instead of removing it. */
  private resetFirstQuestion(): void {
    const firstQuestion = this.questions[0];
    if (!firstQuestion) return;
    this.questions = [
      {
        ...firstQuestion,
        prompt: '',
        answers: this.getClearedAnswers(firstQuestion),
        renderVersion: firstQuestion.renderVersion + 1,
      },
      ...this.questions.slice(1),
    ];
  }

  /**
   * Builds an empty answers object for all answer fields.
   * @param question Question to clear.
   * @returns Cleared answer map.
   */
  private getClearedAnswers(question: QuestionItem): Record<number, string> {
    return Object.fromEntries(question.answerFieldIndexes.map((index) => [index, ''])) as Record<
      number,
      string
    >;
  }

  /** @returns True when all required survey fields are valid. */
  private hasValidRequiredFields(): boolean {
    if (!this.surveyTitle.trim()) return false;
    return this.questions.every(
      (question) => this.isQuestionPromptFilled(question) && this.hasValidAnswerOptions(question),
    );
  }

  /**
   * Checks whether question prompt contains text.
   * @param question Question to validate.
   * @returns True when prompt is not empty.
   */
  private isQuestionPromptFilled(question: QuestionItem): boolean {
    return question.prompt.trim().length > 0;
  }

  /**
   * Validates answer options of a question.
   * @param question Question to validate.
   * @returns True when at least two non-empty answers exist.
   */
  private hasValidAnswerOptions(question: QuestionItem): boolean {
    const answerValues = question.answerFieldIndexes.map(
      (answerFieldIndex) => (question.answers[answerFieldIndex] ?? '').trim(),
    );
    return answerValues.length >= 2 && answerValues.every((value) => value.length > 0);
  }
}
