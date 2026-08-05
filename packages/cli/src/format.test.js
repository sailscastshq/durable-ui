import { describe, expect, it } from 'vitest'

import { formatReport } from './format.js'

const report = {
  root: '/tmp/northstar',
  frameworks: ['React'],
  filesScanned: 4,
  elapsedMs: 12,
  summary: { total: 1, high: 1, medium: 0, review: 0 },
  positiveSignals: [{ id: 'url-state', title: 'URL-backed view state', files: 1 }],
  findings: [
    {
      id: 'auth-redirect-loses-intent',
      severity: 'high',
      title: 'A sign-in redirect may forget the user\'s destination',
      file: 'src/auth.js',
      line: 9,
      column: 3,
      evidence: "navigate('/login')",
      why: 'The user can lose their destination.',
      test: 'Sign in from a protected deep link and verify it is restored.',
      fix: 'Carry a validated return destination.'
    }
  ]
}

describe('formatReport', () => {
  it('prints evidence and the course invitation', () => {
    const output = formatReport(report, { color: false })

    expect(output).toContain('northstar')
    expect(output).toContain('src/auth.js:9:3')
    expect(output).toContain('Browser test: Sign in from a protected deep link')
    expect(output).toContain('Recommendation: Carry a validated return destination')
    expect(output).toContain('https://sailscasts.com/courses/durable-ui')
  })

  it('can hide the course invitation', () => {
    const output = formatReport(report, { color: false, course: false })
    expect(output).not.toContain('MAKE IT DURABLE')
  })

  it('prints valid JSON', () => {
    expect(JSON.parse(formatReport(report, { format: 'json' }))).toEqual(report)
  })
})
