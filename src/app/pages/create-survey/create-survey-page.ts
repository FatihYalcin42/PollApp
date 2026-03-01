import { Component, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

const SURVEY_SETTINGS_KEY = 'pollapp:survey-settings';
type QuestionItem = {
  id: number;
  renderVersion: number;
  allowMultipleAnswers: boolean;
  answerFieldIndexes: number[];
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
    { id: 1, renderVersion: 0, allowMultipleAnswers: false, answerFieldIndexes: [0, 1] },
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
    input.value = input.value.slice(0, 40);
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
      { id: nextId, renderVersion: 0, allowMultipleAnswers: false, answerFieldIndexes: [0, 1] },
    ];
  }

  protected handleQuestionDelete(questionIndex: number): void {
    if (questionIndex === 0) {
      const firstQuestion = this.questions[0];
      if (!firstQuestion) return;
      this.questions = [
        { ...firstQuestion, renderVersion: firstQuestion.renderVersion + 1 },
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
      };
    });
  }

  protected removeAnswerField(questionId: number, answerFieldIndex: number): void {
    this.questions = this.questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            answerFieldIndexes: question.answerFieldIndexes.filter(
              (index) => index !== answerFieldIndex,
            ),
          }
        : question,
    );
  }

  protected publishSurvey(): void {
    this.persistSurveySettings(this.questions[0]?.allowMultipleAnswers ?? false);
    void this.router.navigate(['/single-survey']);
  }

  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  private readAllowMultipleAnswers(): boolean {
    try {
      const raw = localStorage.getItem(SURVEY_SETTINGS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { allowMultipleAnswers?: boolean };
      return !!parsed.allowMultipleAnswers;
    } catch {
      return false;
    }
  }

  private persistSurveySettings(allowMultipleAnswers: boolean): void {
    localStorage.setItem(
      SURVEY_SETTINGS_KEY,
      JSON.stringify({ allowMultipleAnswers }),
    );
  }
}
