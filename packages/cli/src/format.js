import path from 'node:path'

const courseCopy = [
  "Found something fragile? Check out my Durable UI course. I'll show you why it breaks and how to build the durable version.",
  'https://sailscasts.com/courses/durable-ui'
]

export function formatReport(report, options = {}) {
  if (options.format === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`
  }

  const color = createColors(options.color ?? supportsColor(options.stream))
  const lines = []
  const projectName = path.basename(report.root)
  const frameworkCopy = report.frameworks.length
    ? ` · ${report.frameworks.join(', ')}`
    : ''

  lines.push('')
  lines.push(`${color.accent('DURABLE UI')}  ${color.muted('scan')}`)
  lines.push(
    `${color.strong(projectName)}  ${color.muted(`${report.filesScanned} files${frameworkCopy} · ${report.elapsedMs}ms`)}`
  )
  lines.push('')

  if (report.findings.length === 0) {
    lines.push(color.good('No durability risks matched the current checks.'))
    lines.push(
      color.muted('Static analysis cannot prove the experience; test refresh, Back, sign-in, and recovery paths.')
    )
  } else {
    const { high, medium, review } = report.summary
    lines.push(
      [
        high ? color.high(`${high} high`) : null,
        medium ? color.medium(`${medium} medium`) : null,
        review ? color.review(`${review} to review`) : null
      ]
        .filter(Boolean)
        .join(color.muted('  ·  '))
    )

    for (const finding of report.findings) {
      lines.push('')
      lines.push(
        `${severityLabel(finding.severity, color)}  ${color.strong(finding.title)}`
      )
      lines.push(color.location(`${finding.file}:${finding.line}:${finding.column}`))
      if (finding.evidence) lines.push(color.muted(`  ${finding.evidence}`))
      lines.push(`  Impact: ${finding.why}`)
      lines.push(color.good(`  Browser test: ${finding.test}`))
      lines.push(color.muted(`  Recommendation: ${finding.fix}`))
    }
  }

  if (report.positiveSignals.length > 0) {
    lines.push('')
    lines.push(color.strong('Durable signals already present'))
    for (const signal of report.positiveSignals) {
      lines.push(
        `  ${color.good('✓')} ${signal.title} ${color.muted(`(${signal.files} ${pluralize(signal.files, 'file')})`)}`
      )
    }
  }

  if (options.course !== false) {
    lines.push('')
    lines.push(color.accent('MAKE IT DURABLE'))
    lines.push(courseCopy[0])
    lines.push(color.link(courseCopy[1]))
  }

  lines.push('')
  return `${lines.join('\n')}\n`
}

function severityLabel(severity, color) {
  if (severity === 'high') return color.high('HIGH')
  if (severity === 'medium') return color.medium('MEDIUM')
  return color.review('REVIEW')
}

function pluralize(count, word) {
  return count === 1 ? word : `${word}s`
}

function supportsColor(stream) {
  return Boolean(stream?.isTTY && !process.env.NO_COLOR)
}

function createColors(enabled) {
  const wrap = (open, close = '\u001b[0m') =>
    enabled ? (value) => `${open}${value}${close}` : String

  return {
    accent: wrap('\u001b[38;5;220m'),
    good: wrap('\u001b[38;5;78m'),
    high: wrap('\u001b[38;5;203m'),
    link: wrap('\u001b[4;38;5;81m'),
    location: wrap('\u001b[38;5;81m'),
    medium: wrap('\u001b[38;5;214m'),
    muted: wrap('\u001b[2m'),
    review: wrap('\u001b[38;5;147m'),
    strong: wrap('\u001b[1m')
  }
}
