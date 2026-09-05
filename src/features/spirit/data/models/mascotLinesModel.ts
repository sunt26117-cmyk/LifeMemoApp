// src/features/spirit/data/models/mascotLinesModel.ts
import { MascotTimeBucket } from '../../domain/mascotTimeBucket';

export interface MascotGreetingsMap {
  earlyMorning: string[];
  morning: string[];
  noon: string[];
  afternoon: string[];
  evening: string[];
  night: string[];
  lateNight: string[];
}

export interface MascotLinesConfig {
  greetings: MascotGreetingsMap;
  idle_lines: string[];
  tap_reactions: string[];
}
