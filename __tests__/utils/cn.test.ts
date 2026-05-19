/**
 * Tests for lib/utils.ts utilities
 */
import { describe, it, expect } from 'vitest'
import { cn } from '../../lib/utils'

describe('cn() class name utility', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('merges multiple classes', () => {
    const result = cn('flex', 'items-center', 'gap-4')
    expect(result).toContain('flex')
    expect(result).toContain('items-center')
    expect(result).toContain('gap-4')
  })

  it('handles conditional classes (falsy values filtered)', () => {
    const isActive = false
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).not.toContain('active-class')
  })

  it('handles conditional classes (truthy values included)', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
  })

  it('deduplicates conflicting Tailwind classes (twMerge behavior)', () => {
    // twMerge should keep the last conflicting class
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
    expect(result).not.toContain('p-2')
  })

  it('handles object syntax (clsx behavior)', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false })
    expect(result).toBe('text-red-500')
    expect(result).not.toContain('text-blue-500')
  })

  it('handles undefined and null gracefully', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toContain('base')
    expect(result).toContain('end')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles Tailwind size conflicts correctly', () => {
    const result = cn('w-4 h-4', 'w-8')
    expect(result).toContain('w-8')
    expect(result).not.toContain('w-4')
    expect(result).toContain('h-4')
  })
})
