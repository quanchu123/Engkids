// VTT (WebVTT) Parser and Generator for Bilingual Subtitles
import { SubtitleCue } from '@/types';

/**
 * Parse timestamp string (00:00:00.000) to seconds
 */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return parseInt(minutes) * 60 + parseFloat(seconds);
  }
  return parseFloat(timestamp);
}

/**
 * Format seconds to timestamp string (00:00:00.000)
 */
export function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`;
}

/**
 * Parse VTT content to SubtitleCue array
 * Supports both standard VTT and bilingual format with [VI] marker
 */
export function parseVTT(vttContent: string): SubtitleCue[] {
  const lines = vttContent.split('\n');
  const cues: SubtitleCue[] = [];
  let currentCue: Partial<SubtitleCue> | null = null;
  let textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and NOTE comments
    if (line === 'WEBVTT' || line.startsWith('NOTE') || line === '') {
      // Save previous cue if exists
      if (currentCue && textLines.length > 0) {
        const { textEn, textVi } = parseBilingualText(textLines);
        currentCue.textEn = textEn;
        currentCue.textVi = textVi;
        cues.push(currentCue as SubtitleCue);
        currentCue = null;
        textLines = [];
      }
      continue;
    }
    
    // Parse timestamp line: 00:00:00.000 --> 00:00:03.000
    const timestampMatch = line.match(
      /(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})/
    );
    
    if (timestampMatch) {
      // Save previous cue
      if (currentCue && textLines.length > 0) {
        const { textEn, textVi } = parseBilingualText(textLines);
        currentCue.textEn = textEn;
        currentCue.textVi = textVi;
        cues.push(currentCue as SubtitleCue);
        textLines = [];
      }
      
      currentCue = {
        id: `cue-${cues.length + 1}`,
        startTime: parseTimestamp(timestampMatch[1]),
        endTime: parseTimestamp(timestampMatch[2]),
        textEn: '',
        textVi: '',
      };
    } else if (currentCue) {
      // It's subtitle text
      textLines.push(line);
    }
  }
  
  // Don't forget the last cue
  if (currentCue && textLines.length > 0) {
    const { textEn, textVi } = parseBilingualText(textLines);
    currentCue.textEn = textEn;
    currentCue.textVi = textVi;
    cues.push(currentCue as SubtitleCue);
  }
  
  return cues;
}

/**
 * Parse bilingual text from VTT lines
 * Format 1: Two lines - first EN, second VI
 * Format 2: [VI] marker - lines starting with [VI] are Vietnamese
 * Format 3: JSON format - {"en": "...", "vi": "..."}
 */
function parseBilingualText(lines: string[]): { textEn: string; textVi: string } {
  // Try JSON format first
  const joined = lines.join('\n');
  try {
    const json = JSON.parse(joined);
    if (json.en !== undefined) {
      return { textEn: json.en || '', textVi: json.vi || '' };
    }
  } catch {
    // Not JSON, continue
  }
  
  // Check for [VI] marker format
  const enLines: string[] = [];
  const viLines: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('[VI]') || line.startsWith('[vi]')) {
      viLines.push(line.replace(/^\[VI\]\s*/i, ''));
    } else if (line.startsWith('[EN]') || line.startsWith('[en]')) {
      enLines.push(line.replace(/^\[EN\]\s*/i, ''));
    } else {
      // Default: if no marker, assume first line is EN, second is VI
      enLines.push(line);
    }
  }
  
  // If we have both marked lines
  if (viLines.length > 0) {
    return {
      textEn: enLines.join(' '),
      textVi: viLines.join(' '),
    };
  }
  
  // Default: first line EN, rest as VI (or empty)
  if (lines.length >= 2) {
    return {
      textEn: lines[0],
      textVi: lines.slice(1).join(' '),
    };
  }
  
  return {
    textEn: lines[0] || '',
    textVi: '',
  };
}

/**
 * Generate VTT content from SubtitleCue array
 */
export function generateVTT(cues: SubtitleCue[], format: 'standard' | 'bilingual' = 'bilingual'): string {
  let vtt = 'WEBVTT\n\n';
  
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    vtt += `${i + 1}\n`;
    vtt += `${formatTimestamp(cue.startTime)} --> ${formatTimestamp(cue.endTime)}\n`;
    
    if (format === 'bilingual' && cue.textVi) {
      vtt += `${cue.textEn}\n`;
      vtt += `[VI] ${cue.textVi}\n`;
    } else {
      vtt += `${cue.textEn}\n`;
    }
    vtt += '\n';
  }
  
  return vtt;
}

/**
 * Find cue index based on video time
 */
export function findCurrentCueIndex(cues: SubtitleCue[], currentTime: number): number {
  if (cues.length === 0) return -1;

  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];

    if (currentTime < cue.startTime) {
      high = mid - 1;
    } else if (currentTime > cue.endTime) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return high;
}

/**
 * Parse SRT format and convert to SubtitleCue array
 */
export function parseSRT(srtContent: string): SubtitleCue[] {
  const blocks = srtContent.trim().split(/\n\n+/);
  const cues: SubtitleCue[] = [];
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;
    
    // Find timestamp line
    const timestampLine = lines.find(line => line.includes('-->'));
    if (!timestampLine) continue;
    
    // Parse timestamp (SRT uses comma for milliseconds)
    const timestampMatch = timestampLine.replace(/,/g, '.').match(
      /(\d{1,2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})/
    );
    
    if (!timestampMatch) continue;
    
    // Get text lines (skip number and timestamp)
    const textStartIdx = lines.indexOf(timestampLine) + 1;
    const textLines = lines.slice(textStartIdx);
    
    const { textEn, textVi } = parseBilingualText(textLines);
    
    cues.push({
      id: `cue-${cues.length + 1}`,
      startTime: parseTimestamp(timestampMatch[1]),
      endTime: parseTimestamp(timestampMatch[2]),
      textEn,
      textVi,
    });
  }
  
  return cues;
}

/**
 * Create empty cue
 */
export function createEmptyCue(startTime: number = 0, duration: number = 3): SubtitleCue {
  return {
    id: `cue-${Date.now()}`,
    startTime,
    endTime: startTime + duration,
    textEn: '',
    textVi: '',
  };
}
