import type { PillarName } from '@/lib/types'

export interface ProfileQuestion {
  dimension: 'consistency' | 'duration' | 'independence' | 'resilience'
  text: string
  subText: string
  options: [string, string, string, string] // A, B, C, D — always exactly 4
}

export type PillarQuestions = {
  pillar: PillarName
  emoji: string
  label: string
  questions: [ProfileQuestion, ProfileQuestion, ProfileQuestion, ProfileQuestion]
}

const OPTIONS_CONSISTENCY: [string, string, string, string] = [
  "I don't really have a regular practice here",
  'A few times a week when I think of it',
  'Most days — I miss occasionally',
  'Every day, almost without exception',
]

const OPTIONS_DURATION: [string, string, string, string] = [
  "I'm just getting started or restarting",
  'A few weeks',
  'Several months',
  'More than a year — and it has stayed consistent',
]

const OPTIONS_INDEPENDENCE: [string, string, string, string] = [
  'Yes — I need a goal, a challenge, or outside pressure to keep going',
  'Sometimes — I slow down without a target',
  'Rarely — it mostly runs on its own',
  'Never — this is simply part of who I am',
]

const OPTIONS_RESILIENCE: [string, string, string, string] = [
  'It disappears until things settle down',
  'It takes a significant hit',
  'It bends, but I bounce back within a few days',
  'Almost nothing stops it — I find a way',
]

export const CONSISTENCY_PROFILE_QUESTIONS: PillarQuestions[] = [
  {
    pillar: 'spiritual',
    emoji: '🙏',
    label: 'Spiritual',
    questions: [
      {
        dimension: 'consistency',
        text: 'How consistent is this practice right now?',
        subText:
          'How often do you practice spiritual habits — prayer, Scripture, devotion, reflection — right now?',
        options: OPTIONS_CONSISTENCY,
      },
      {
        dimension: 'duration',
        text: 'How long have you maintained this practice?',
        subText: 'How long have you maintained your current spiritual practice?',
        options: OPTIONS_DURATION,
      },
      {
        dimension: 'independence',
        text: 'Does this practice depend on outside structure to continue?',
        subText:
          'Does your spiritual practice depend on a church season, a Bible reading plan, or external structure to keep going?',
        options: OPTIONS_INDEPENDENCE,
      },
      {
        dimension: 'resilience',
        text: 'What happens to this practice when life gets hard?',
        subText:
          'When life gets hard — grief, stress, a spiritually dry season — what happens to your spiritual practice?',
        options: OPTIONS_RESILIENCE,
      },
    ],
  },
  {
    pillar: 'physical',
    emoji: '💪',
    label: 'Physical',
    questions: [
      {
        dimension: 'consistency',
        text: 'How consistent is this practice right now?',
        subText:
          'How consistently do you move your body with intention — exercise, walking, stretching — right now?',
        options: OPTIONS_CONSISTENCY,
      },
      {
        dimension: 'duration',
        text: 'How long have you maintained this practice?',
        subText: 'How long have you maintained your current physical practice?',
        options: OPTIONS_DURATION,
      },
      {
        dimension: 'independence',
        text: 'Does this practice depend on outside structure to continue?',
        subText:
          "Does your physical activity depend on a fitness goal, an event you're training for, or a program with an end date?",
        options: OPTIONS_INDEPENDENCE,
      },
      {
        dimension: 'resilience',
        text: 'What happens to this practice when life gets hard?',
        subText:
          'When life gets hard — travel, illness, a brutal week — what happens to your physical practice?',
        options: OPTIONS_RESILIENCE,
      },
    ],
  },
  {
    pillar: 'nutritional',
    emoji: '🥗',
    label: 'Nutritional',
    questions: [
      {
        dimension: 'consistency',
        text: 'How consistent is this practice right now?',
        subText:
          'How consistently do you make intentional, health-supporting food and hydration choices right now?',
        options: OPTIONS_CONSISTENCY,
      },
      {
        dimension: 'duration',
        text: 'How long have you maintained this practice?',
        subText: 'How long have you maintained your current nutritional habits?',
        options: OPTIONS_DURATION,
      },
      {
        dimension: 'independence',
        text: 'Does this practice depend on outside structure to continue?',
        subText:
          'Do your nutritional habits depend on a specific diet, a program, or a season (like January or summer) to stay consistent?',
        options: OPTIONS_INDEPENDENCE,
      },
      {
        dimension: 'resilience',
        text: 'What happens to this practice when life gets hard?',
        subText:
          'When life gets hard — travel, stress, social events — what happens to your nutritional habits?',
        options: OPTIONS_RESILIENCE,
      },
    ],
  },
  {
    pillar: 'personal',
    emoji: '📝',
    label: 'Personal',
    questions: [
      {
        dimension: 'consistency',
        text: 'How consistent is this practice right now?',
        subText:
          'How consistently do you invest in personal development — reading, writing, learning, emotional health, creative expression — right now?',
        options: OPTIONS_CONSISTENCY,
      },
      {
        dimension: 'duration',
        text: 'How long have you maintained this practice?',
        subText: 'How long have you maintained your current personal development habits?',
        options: OPTIONS_DURATION,
      },
      {
        dimension: 'independence',
        text: 'Does this practice depend on outside structure to continue?',
        subText:
          'Do your personal growth habits depend on a course, a reading challenge, or some other external structure to keep going?',
        options: OPTIONS_INDEPENDENCE,
      },
      {
        dimension: 'resilience',
        text: 'What happens to this practice when life gets hard?',
        subText:
          'When life gets hard — busy seasons, emotional difficulty, family demands — what happens to your personal development habits?',
        options: OPTIONS_RESILIENCE,
      },
    ],
  },
  {
    pillar: 'relational',
    emoji: '🤝',
    label: 'Relational',
    questions: [
      {
        dimension: 'consistency',
        text: 'How consistent is this practice right now?',
        subText:
          'How consistently do you take intentional action to encourage, serve, or invest in someone outside your immediate family — right now?',
        options: OPTIONS_CONSISTENCY,
      },
      {
        dimension: 'duration',
        text: 'How long have you maintained this practice?',
        subText:
          'How long have you maintained a regular habit of being intentionally present and giving in your relationships?',
        options: OPTIONS_DURATION,
      },
      {
        dimension: 'independence',
        text: 'Does this practice depend on outside structure to continue?',
        subText:
          'Does your investment in others depend on a scheduled event, an organized group, or an external commitment to keep you engaged?',
        options: OPTIONS_INDEPENDENCE,
      },
      {
        dimension: 'resilience',
        text: 'What happens to this practice when life gets hard?',
        subText:
          'When life gets hard — busy seasons, personal difficulty, emotional drain — what happens to your intentional investment in the people around you?',
        options: OPTIONS_RESILIENCE,
      },
    ],
  },
]
