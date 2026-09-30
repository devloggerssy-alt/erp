import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS } from './permission-catalog'

describe('permission catalog — danger resource', () => {
  it('includes export and import alongside reset', () => {
    expect(ALL_PERMISSIONS).toContain('danger.reset')
    expect(ALL_PERMISSIONS).toContain('danger.export')
    expect(ALL_PERMISSIONS).toContain('danger.import')
  })
})
