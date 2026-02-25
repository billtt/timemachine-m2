export interface ReflectionQuestionConfig {
  id: string;
  text: string;
  order: number;
}

// Default question set. To change questions in the future, edit this array.
// Existing saved reflections will continue to render their stored question text
// (source-of-truth is the saved record, not this config).
export const DEFAULT_REFLECTION_QUESTIONS: ReflectionQuestionConfig[] = [
  { id: 'gratitude', text: 'What am I grateful for today?', order: 0 },
  { id: 'body-sensations', text: 'What sensations do I notice in my body right now?', order: 1 },
  { id: 'tomorrow-goal', text: 'What is one small thing I will complete tomorrow?', order: 2 }
];
