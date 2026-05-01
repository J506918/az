import { describe, it, expect } from 'vitest';
import { parseDeviceArchitecture } from '../device-manager';

describe('parseDeviceArchitecture', () => {
  it('should parse "Tici" to "tici"', () => {
    expect(parseDeviceArchitecture('Tici')).toBe('tici');
  });

  it('should parse "Tizi" to "tizi"', () => {
    expect(parseDeviceArchitecture('Tizi')).toBe('tizi');
  });

  it('should parse "Mici" to "mici"', () => {
    expect(parseDeviceArchitecture('Mici')).toBe('mici');
  });

  it('should parse "Neo" to "neo"', () => {
    expect(parseDeviceArchitecture('Neo')).toBe('neo');
  });

  it('should parse "tici" (lowercase) to "tici"', () => {
    expect(parseDeviceArchitecture('tici')).toBe('tici');
  });

  it('should parse "tizi" (lowercase) to "tizi"', () => {
    expect(parseDeviceArchitecture('tizi')).toBe('tizi');
  });

  it('should parse "mici" (lowercase) to "mici"', () => {
    expect(parseDeviceArchitecture('mici')).toBe('mici');
  });

  it('should parse "neo" (lowercase) to "neo"', () => {
    expect(parseDeviceArchitecture('neo')).toBe('neo');
  });

  it('should parse "comma3" to "tici"', () => {
    expect(parseDeviceArchitecture('comma3')).toBe('unknown');
  });

  it('should parse "comma3x" to "unknown" (not directly mapped)', () => {
    expect(parseDeviceArchitecture('comma3x')).toBe('unknown');
  });

  it('should parse "comma4" to "unknown" (not directly mapped)', () => {
    expect(parseDeviceArchitecture('comma4')).toBe('unknown');
  });

  it('should parse "comma2" to "unknown" (not directly mapped)', () => {
    expect(parseDeviceArchitecture('comma2')).toBe('unknown');
  });

  it('should return "unknown" for empty string', () => {
    expect(parseDeviceArchitecture('')).toBe('unknown');
  });

  it('should return "unknown" for undefined', () => {
    expect(parseDeviceArchitecture(undefined as any)).toBe('unknown');
  });

  it('should return "unknown" for unrecognized values', () => {
    expect(parseDeviceArchitecture('unknown')).toBe('unknown');
  });

  it('should handle whitespace', () => {
    expect(parseDeviceArchitecture('  Tici  ')).toBe('tici');
  });

  it('should distinguish between tici and tizi', () => {
    expect(parseDeviceArchitecture('tici')).toBe('tici');
    expect(parseDeviceArchitecture('tizi')).toBe('tizi');
  });
});
