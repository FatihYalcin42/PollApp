export type SurveyQuestion = {
  id: number;
  prompt: string;
  hint: string;
  allowMultiple: boolean;
  answers: string[];
};

export type Survey = {
  id: number;
  category: string;
  title: string;
  description: string;
  daysLeft: number;
  questions: SurveyQuestion[];
};

export const SURVEYS: Survey[] = [
  {
    id: 1,
    category: 'Team activities',
    title: "Let's Plan the Next Team Event Together",
    description:
      'We want to create team activities that everyone will enjoy - share your preferences and ideas in our survey to help us plan better experiences together.',
    daysLeft: 1,
    questions: [
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
    ],
  },
  {
    id: 2,
    category: 'Gaming',
    title: 'Gaming habits and favorite games!',
    description:
      'Help us organize better gaming sessions by picking your favorite formats, genres, and play times.',
    daysLeft: 3,
    questions: [
      {
        id: 1,
        prompt: 'Which game genres do you enjoy most?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Action', 'Sports', 'Strategy', 'Party games', 'Racing'],
      },
      {
        id: 2,
        prompt: 'How often do you play multiplayer games?',
        hint: '',
        allowMultiple: false,
        answers: ['Daily', '2-3 times a week', 'Once a week', 'Rarely'],
      },
      {
        id: 3,
        prompt: 'What matters most for a gaming event?',
        hint: '',
        allowMultiple: false,
        answers: ['Competition', 'Fun atmosphere', 'Short rounds', 'Mixed skill levels'],
      },
      {
        id: 4,
        prompt: 'Preferred gaming session length?',
        hint: '',
        allowMultiple: false,
        answers: ['1 hour', '2 hours', '3 hours', 'Half-day event'],
      },
    ],
  },
  {
    id: 3,
    category: 'Healthy Lifestyle',
    title: 'Healthier future: Fit & wellness survey!',
    description:
      'Your feedback helps us shape wellness activities that are practical, motivating, and easy to join.',
    daysLeft: 2,
    questions: [
      {
        id: 1,
        prompt: 'Which wellness activities interest you most?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Yoga', 'Guided stretching', 'Walking challenges', 'Meditation', 'Nutrition sessions'],
      },
      {
        id: 2,
        prompt: 'When should wellness sessions happen?',
        hint: '',
        allowMultiple: false,
        answers: ['Before work', 'Lunch break', 'After work'],
      },
      {
        id: 3,
        prompt: 'What blocks you from joining wellness activities?',
        hint: '',
        allowMultiple: false,
        answers: ['Time', 'Energy', 'Not enough options', 'Schedule conflict'],
      },
      {
        id: 4,
        prompt: 'How long should a wellness session be?',
        hint: '',
        allowMultiple: false,
        answers: ['15 minutes', '30 minutes', '45 minutes', '60 minutes'],
      },
    ],
  },
  {
    id: 4,
    category: 'Education & Learning',
    title: 'Learning Friday sessions feedback',
    description:
      'Tell us which learning topics and formats bring the most value so we can improve every session.',
    daysLeft: 6,
    questions: [
      {
        id: 1,
        prompt: 'Which topics should we focus on next?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Frontend skills', 'Backend architecture', 'Testing', 'Career growth', 'AI workflows'],
      },
      {
        id: 2,
        prompt: 'Which session format do you prefer?',
        hint: '',
        allowMultiple: false,
        answers: ['Live workshop', 'Short talks', 'Hands-on challenge', 'Panel Q&A'],
      },
      {
        id: 3,
        prompt: 'What pace works best for you?',
        hint: '',
        allowMultiple: false,
        answers: ['Beginner friendly', 'Intermediate', 'Advanced'],
      },
      {
        id: 4,
        prompt: 'How often should we run Learning Friday?',
        hint: '',
        allowMultiple: false,
        answers: ['Weekly', 'Bi-weekly', 'Monthly'],
      },
    ],
  },
  {
    id: 5,
    category: 'Technology & Innovation',
    title: 'AI tools at work survey',
    description:
      'Share how you currently use AI tools so we can identify best practices and training opportunities.',
    daysLeft: 7,
    questions: [
      {
        id: 1,
        prompt: 'Where do AI tools help you most today?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Research', 'Writing', 'Coding', 'Data analysis', 'Presentation prep'],
      },
      {
        id: 2,
        prompt: 'What is your biggest challenge with AI tools?',
        hint: '',
        allowMultiple: false,
        answers: ['Prompt quality', 'Trust in output', 'Privacy concerns', 'Tool overload'],
      },
      {
        id: 3,
        prompt: 'How much training would you like?',
        hint: '',
        allowMultiple: false,
        answers: ['Quick tips only', '1-hour basics', 'Deep-dive workshop'],
      },
      {
        id: 4,
        prompt: 'Should we create a shared AI playbook?',
        hint: '',
        allowMultiple: false,
        answers: ['Yes, urgently', 'Yes, later', 'No need right now'],
      },
    ],
  },
  {
    id: 6,
    category: 'Workplace Culture',
    title: 'Office wellbeing pulse',
    description:
      'This short pulse helps us understand team mood and improve daily collaboration across the office.',
    daysLeft: 10,
    questions: [
      {
        id: 1,
        prompt: 'How would you describe the current team atmosphere?',
        hint: '',
        allowMultiple: false,
        answers: ['Very positive', 'Mostly positive', 'Neutral', 'Needs improvement'],
      },
      {
        id: 2,
        prompt: 'What supports better collaboration?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Clear priorities', 'Faster feedback', 'Team rituals', 'Fewer meetings'],
      },
      {
        id: 3,
        prompt: 'How balanced is your current workload?',
        hint: '',
        allowMultiple: false,
        answers: ['Very balanced', 'Mostly balanced', 'Sometimes heavy', 'Often too heavy'],
      },
      {
        id: 4,
        prompt: 'What should we improve first?',
        hint: '',
        allowMultiple: false,
        answers: ['Communication', 'Planning', 'Recognition', 'Focus time'],
      },
    ],
  },
  {
    id: 7,
    category: 'Social & Events',
    title: 'After-work hangout preferences',
    description:
      'Pick your favorite social options so we can plan after-work events that fit different interests.',
    daysLeft: 12,
    questions: [
      {
        id: 1,
        prompt: 'Which hangout formats do you enjoy?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Dinner', 'Arcade', 'Movie night', 'Board games', 'Outdoor meet-up'],
      },
      {
        id: 2,
        prompt: 'Which weekday works best?',
        hint: '',
        allowMultiple: false,
        answers: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      {
        id: 3,
        prompt: 'How often should we plan hangouts?',
        hint: '',
        allowMultiple: false,
        answers: ['Every week', 'Twice a month', 'Monthly'],
      },
      {
        id: 4,
        prompt: 'Preferred start time?',
        hint: '',
        allowMultiple: false,
        answers: ['17:00', '18:00', '19:00'],
      },
    ],
  },
  {
    id: 8,
    category: 'Food & Drinks',
    title: 'Team lunch and snacks survey',
    description:
      'Help us choose better lunch options, snack preferences, and food-friendly team moments.',
    daysLeft: 14,
    questions: [
      {
        id: 1,
        prompt: 'Which lunch options do you prefer?',
        hint: 'More than one answers are possible.',
        allowMultiple: true,
        answers: ['Salads & bowls', 'Sandwiches', 'Warm meals', 'Street food', 'Vegan options'],
      },
      {
        id: 2,
        prompt: 'How often should we organize team lunch?',
        hint: '',
        allowMultiple: false,
        answers: ['Weekly', 'Bi-weekly', 'Monthly'],
      },
      {
        id: 3,
        prompt: 'What snack style do you prefer at work?',
        hint: '',
        allowMultiple: false,
        answers: ['Healthy snacks', 'Mixed snacks', 'Sweet snacks', 'No snacks'],
      },
      {
        id: 4,
        prompt: 'Should we rotate cuisines each event?',
        hint: '',
        allowMultiple: false,
        answers: ['Yes', 'Sometimes', 'No preference'],
      },
    ],
  },
];
