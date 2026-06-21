import { describe, it, expect } from 'vitest';
import { deriveBlank } from './sentence-blank';

describe('deriveBlank', () => {
  it('blanks the first matching target word', () => {
    const r = deriveBlank('I go to school every day.', ['school']);
    expect(r).not.toBeNull();
    expect(r!.answer).toBe('school');
    expect(r!.before).toBe('I go to');
    expect(r!.after).toBe('every day.');
    expect(r!.blank).toBe('school'); // exact original token (no trailing space)
  });

  it('matches case-insensitively and ignores surrounding punctuation', () => {
    const r = deriveBlank('School is fun!', ['school']);
    expect(r).not.toBeNull();
    expect(r!.answer).toBe('school');
    expect(r!.before).toBe('');
    expect(r!.blank).toBe('School'); // original casing preserved for display
  });

  it('returns null when no target word is present', () => {
    expect(deriveBlank('The cat sat on the mat.', ['school', 'travel'])).toBeNull();
  });

  it('skips trivial target words shorter than 3 characters', () => {
    // "to" is a target but too short to blank; "garden" is the real one.
    const r = deriveBlank('We walk to the garden.', ['to', 'garden']);
    expect(r).not.toBeNull();
    expect(r!.answer).toBe('garden');
  });

  it('returns null for an empty sentence', () => {
    expect(deriveBlank('   ', ['school'])).toBeNull();
  });

  it('returns null when targets are all too short', () => {
    expect(deriveBlank('I am a big fan.', ['a', 'am'])).toBeNull();
  });

  it('preserves an internal apostrophe in the matched word', () => {
    const r = deriveBlank("She doesn't like rain.", ["doesn't"]);
    expect(r).not.toBeNull();
    expect(r!.answer).toBe("doesn't");
  });

  it('picks the first target when several are present', () => {
    const r = deriveBlank('The travel guide loves school.', ['school', 'travel']);
    expect(r).not.toBeNull();
    expect(r!.answer).toBe('travel');
  });
});
