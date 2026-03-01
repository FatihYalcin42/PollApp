import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type SurveyQuestion = {
  id: number;
  prompt: string;
  hint: string;
  allowMultiple: boolean;
  answers: string[];
};

@Component({
  selector: 'app-single-survey-page',
  imports: [RouterLink],
  templateUrl: './single-survey-page.html',
  styleUrl: './single-survey-page.scss',
})
export class SingleSurveyPage {
  protected selectedAnswers: Record<number, number[]> = {};
  protected readonly questionTitle = "Let's Plan the Next Team Event Together";
  protected readonly questions: SurveyQuestion[] = [
    {
      id: 1,
      prompt: 'Which date would work best for you?',
      hint: 'More than one answers are possible.',
      allowMultiple: true,
      answers: ['19.09.2026, Friday', '10.10.2026, Friday', '11.10.2026, Saturday', '31.10.2026, Friday'],
    },
    {
      id: 2,
      prompt: 'Choose the activities you prefer',
      hint: 'More than one answers are possible.',
      allowMultiple: true,
      answers: [
        'Outdoor adventure like kayaking',
        'Office Costume Party',
        'Bowling, mini-golf, volleyball',
        'Beach party, Music & cocktails',
        'Escape room',
      ],
    },
    {
      id: 3,
      prompt: "What's most important to you in a team event?",
      hint: '',
      allowMultiple: false,
      answers: ['Team bonding', 'Food and drinks', 'Trying something new', 'Keeping it low-key and stress-free'],
    },
    {
      id: 4,
      prompt: 'How long would you prefer the event to last?',
      hint: '',
      allowMultiple: false,
      answers: ['Half a day', 'Full day', 'Evening only'],
    },
  ];

  protected toggleAnswer(questionId: number, answerIndex: number): void {
    const question = this.questions.find((item) => item.id === questionId);
    if (!question) return;
    const current = this.selectedAnswers[questionId] ?? [];
    const next = question.allowMultiple
      ? current.includes(answerIndex)
        ? current.filter((id) => id !== answerIndex)
        : [...current, answerIndex]
      : current[0] === answerIndex ? [] : [answerIndex];
    this.selectedAnswers = { ...this.selectedAnswers, [questionId]: next };
  }

  protected isAnswerSelected(questionId: number, answerIndex: number): boolean {
    return (this.selectedAnswers[questionId] ?? []).includes(answerIndex);
  }

  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
