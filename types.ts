export enum LessonType {
  INTRO_VOICE = 'INTRO_VOICE',
  CHAT_BASICS = 'CHAT_BASICS',
  TRANSCRIPTION = 'TRANSCRIPTION',
  CREATIVITY_VEO = 'CREATIVITY_VEO',
  QUICK_HELP = 'QUICK_HELP'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}

export interface LessonConfig {
  id: LessonType;
  title: string;
  description: string;
  videoUrl?: string; // Placeholder for YouTube
  icon: string;
}

// Extend Window interface for AI Studio check
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}
