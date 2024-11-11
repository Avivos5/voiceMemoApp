import { Audio } from 'expo-av';

export interface Recording {
  uri: string;
  filename: string;
  showName: string;
  date: Date;
  duration: string;
  isPlaying: boolean;
  isPaused: boolean;
  sound?: Audio.Sound;
}
