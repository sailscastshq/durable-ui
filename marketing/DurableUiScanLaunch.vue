<script setup>
import { computed } from 'vue'
import { Easing, interpolate, useFrame } from 'pellicule'

defineVideoConfig({
  durationInSeconds: 20,
  fps: 30,
  width: 1920,
  height: 1080
})

const frame = useFrame()

const command = 'npx durable-ui scan ./src'
const terminalLines = [
  { text: 'DURABLE UI  scan', tone: 'brand' },
  { text: 'acme-dashboard  48 files · React, Inertia · 126ms', tone: 'muted' },
  { text: '', tone: 'muted' },
  { text: '2 high  ·  1 to review', tone: 'summary' },
  { text: '', tone: 'muted' },
  { text: "HIGH  A sign-in redirect may forget the user's destination", tone: 'high' },
  { text: 'src/pages/Account.tsx:18:5', tone: 'link' },
  { text: "  navigate('/login')", tone: 'evidence' },
  { text: '  Impact: The user can land somewhere generic after sign-in.', tone: 'plain' },
  { text: '  Browser test: Sign in from a protected deep link and verify it returns.', tone: 'good' },
  { text: '  Recommendation: Carry a validated return destination.', tone: 'muted' },
  { text: '', tone: 'muted' },
  { text: 'REVIEW  Decide whether this dialog should survive refresh', tone: 'review' },
  { text: 'src/pages/Customers.tsx:42:3', tone: 'link' },
  { text: '  Browser test: Open it, refresh, then use Back and Forward.', tone: 'good' }
]

const jsonLines = [
  ['{', 'punctuation'],
  ['  "schemaVersion": 1,', 'plain'],
  ['  "scannerVersion": "0.0.1",', 'plain'],
  ['  "frameworks": ["React", "Inertia"],', 'plain'],
  ['  "summary": { "total": 3, "high": 2, "review": 1 },', 'plain'],
  ['  "findings": [', 'plain'],
  ['    {', 'punctuation'],
  ['      "severity": "high",', 'high'],
  ['      "file": "src/pages/Account.tsx",', 'link'],
  ['      "line": 18,', 'plain'],
  ['      "why": "Return intent may be lost.",', 'plain'],
  ['      "test": "Sign in from a protected deep link…",', 'good'],
  ['      "fix": "Carry a validated return destination."', 'review'],
  ['    }', 'punctuation'],
  ['  ]', 'punctuation'],
  ['}', 'punctuation']
]

const fitCards = [
  {
    number: '01',
    title: 'State-rich product flows',
    copy: 'Forms, onboarding, checkout, search, tables, filters, tabs, and dialogs.',
    chips: ['Progress', 'URL state', 'Navigation']
  },
  {
    number: '02',
    title: 'Modern authored source',
    copy: 'JavaScript, TypeScript, JSX, TSX, Vue, Svelte, Astro, HTML, and EJS.',
    chips: ['Source-first', 'Zero config', 'Zero deps']
  },
  {
    number: '03',
    title: 'Teams that test the browser',
    copy: 'Useful evidence for review without turning heuristic findings into CI failures.',
    chips: ['React', 'Vue', 'Svelte']
  }
]

const introOpacity = computed(() => sceneOpacity(0, 116, 20))
const fitOpacity = computed(() => sceneOpacity(100, 230, 20))
const terminalOpacity = computed(() => sceneOpacity(214, 435, 22))
const jsonOpacity = computed(() => sceneOpacity(420, 530, 18))
const outroOpacity = computed(() => sceneOpacity(515, 600, 18))

const darkBackdropOpacity = computed(() => {
  const enter = tween(frame.value, 195, 230, 0, 1)
  const leave = tween(frame.value, 505, 542, 1, 0)
  return Math.min(enter, leave)
})

const introTitleStyle = computed(() => ({
  opacity: tween(frame.value, 12, 38, 0, 1),
  transform: `translateY(${tween(frame.value, 12, 44, 58, 0)}px) scale(${tween(frame.value, 12, 44, 0.96, 1)})`
}))

const introKickerStyle = computed(() => ({
  opacity: tween(frame.value, 3, 24, 0, 1),
  transform: `translateY(${tween(frame.value, 3, 24, 18, 0)}px)`
}))

const introCommandStyle = computed(() => ({
  opacity: tween(frame.value, 50, 76, 0, 1),
  transform: `translateY(${tween(frame.value, 50, 78, 28, 0)}px)`
}))

const visibleCommand = computed(() => {
  const count = Math.floor(linearTween(frame.value, 232, 274, 0, command.length))
  return command.slice(0, count)
})

const showCursor = computed(() => Math.floor(frame.value / 9) % 2 === 0)

const terminalWindowStyle = computed(() => ({
  transform: `translateY(${tween(frame.value, 216, 248, 65, 0)}px) scale(${tween(frame.value, 216, 248, 0.965, 1)})`,
  opacity: tween(frame.value, 216, 240, 0, 1)
}))

const jsonPanelStyle = computed(() => ({
  transform: `translateX(${tween(frame.value, 425, 455, 80, 0)}px)`,
  opacity: tween(frame.value, 425, 450, 0, 1)
}))

const jsonCopyStyle = computed(() => ({
  transform: `translateY(${tween(frame.value, 432, 462, 38, 0)}px)`,
  opacity: tween(frame.value, 432, 458, 0, 1)
}))

const outroTitleStyle = computed(() => ({
  opacity: tween(frame.value, 525, 552, 0, 1),
  transform: `translateY(${tween(frame.value, 525, 558, 52, 0)}px)`
}))

const outroCommandStyle = computed(() => ({
  opacity: tween(frame.value, 548, 574, 0, 1),
  transform: `translateY(${tween(frame.value, 548, 578, 26, 0)}px) scale(${tween(frame.value, 548, 578, 0.97, 1)})`
}))

const orbitStyle = computed(() => ({
  transform: `translate3d(${Math.sin(frame.value / 42) * 16}px, ${Math.cos(frame.value / 50) * 12}px, 0) rotate(${frame.value * 0.08}deg)`
}))

function cardStyle(index) {
  const start = 128 + index * 10
  return {
    opacity: tween(frame.value, start, start + 26, 0, 1),
    transform: `translateY(${tween(frame.value, start, start + 30, 54, 0)}px)`
  }
}

function terminalLineStyle(index) {
  const start = 278 + index * 5
  return {
    opacity: tween(frame.value, start, start + 8, 0, 1),
    transform: `translateY(${tween(frame.value, start, start + 10, 8, 0)}px)`
  }
}

function jsonLineStyle(index) {
  const start = 443 + index * 2
  return {
    opacity: tween(frame.value, start, start + 6, 0, 1),
    transform: `translateX(${tween(frame.value, start, start + 6, 12, 0)}px)`
  }
}

function sceneOpacity(start, end, fade) {
  return Math.min(
    tween(frame.value, start, start + fade, 0, 1),
    tween(frame.value, end - fade, end, 1, 0)
  )
}

function tween(value, start, end, from, to) {
  return interpolate(value, [start, end], [from, to], {
    easing: Easing.easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
}

function linearTween(value, start, end, from, to) {
  return interpolate(value, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
}
</script>

<template>
  <main class="film">
    <div class="paper-grid" />
    <div class="ambient ambient-one" />
    <div class="ambient ambient-two" />
    <div class="dark-backdrop" :style="{ opacity: darkBackdropOpacity }" />

    <header class="masthead" :class="{ inverted: darkBackdropOpacity > 0.55 }">
      <div class="wordmark">
        <span class="wordmark-mark"><span /></span>
        <span>DURABLE UI</span>
      </div>
      <div class="version-pill">SCAN · V0.0.1</div>
    </header>

    <section class="scene intro-scene" :style="{ opacity: introOpacity }">
      <div class="orbit" :style="orbitStyle">
        <div class="orbit-ring ring-one" />
        <div class="orbit-ring ring-two" />
        <div class="orbit-core"><span /></div>
      </div>

      <div class="intro-content">
        <div class="launch-pill" :style="introKickerStyle">
          <span class="launch-dot" />
          Announcing
        </div>
        <h1 :style="introTitleStyle">
          Durable UI <span>Scan</span>
        </h1>
        <p class="intro-subtitle" :style="introTitleStyle">
          Find fragile UI state<br />before users do.
        </p>
        <div class="command-pill" :style="introCommandStyle">
          <span class="prompt">$</span>
          <span>npx durable-ui scan</span>
          <span class="command-badge">zero dependencies</span>
        </div>
      </div>
    </section>

    <section class="scene fit-scene" :style="{ opacity: fitOpacity }">
      <div class="section-heading">
        <p class="eyebrow">BEST TODAY</p>
        <h2>Built for the UI<br />that does real work.</h2>
        <p>Source-first web applications with state users expect to survive.</p>
      </div>

      <div class="fit-grid">
        <article
          v-for="(card, index) in fitCards"
          :key="card.number"
          class="fit-card"
          :style="cardStyle(index)"
        >
          <div class="card-topline">
            <span>{{ card.number }}</span>
            <span class="mini-mark"><span /></span>
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.copy }}</p>
          <div class="chip-row">
            <span v-for="chip in card.chips" :key="chip">{{ chip }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="scene terminal-scene" :style="{ opacity: terminalOpacity }">
      <div class="terminal-heading">
        <p class="eyebrow light">ONE COMMAND</p>
        <h2>Evidence you can act on.</h2>
        <p>Location. Impact. Browser test. Recommendation.</p>
      </div>

      <div class="terminal-window" :style="terminalWindowStyle">
        <div class="terminal-chrome">
          <div class="traffic-lights">
            <span class="red" />
            <span class="yellow" />
            <span class="green" />
          </div>
          <span class="terminal-title">acme-dashboard — zsh</span>
          <span class="terminal-status">⌁ local</span>
        </div>
        <div class="terminal-body">
          <div class="terminal-command">
            <span class="prompt">❯</span>
            <span>{{ visibleCommand }}</span><span v-if="showCursor" class="cursor">▋</span>
          </div>
          <div class="terminal-output">
            <div
              v-for="(line, index) in terminalLines"
              :key="`${index}-${line.text}`"
              class="terminal-line"
              :class="`tone-${line.tone}`"
              :style="terminalLineStyle(index)"
            >
              {{ line.text || ' ' }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="scene json-scene" :style="{ opacity: jsonOpacity }">
      <div class="json-copy" :style="jsonCopyStyle">
        <p class="eyebrow light">CLEAN JSON</p>
        <h2>Human when<br />you’re exploring.<br /><span>Structured when<br />you’re integrating.</span></h2>
        <p>Ready for editors and CI—without failing builds for heuristic findings.</p>
        <div class="integration-row">
          <span>--json</span>
          <span>exit 0</span>
          <span>schema v1</span>
        </div>
      </div>

      <div class="json-panel" :style="jsonPanelStyle">
        <div class="json-panel-header">
          <div>
            <span class="json-dot" />
            durable-ui-report.json
          </div>
          <span>UTF-8</span>
        </div>
        <div class="json-code">
          <div
            v-for="([line, tone], index) in jsonLines"
            :key="`${index}-${line}`"
            class="json-line"
            :class="`tone-${tone}`"
            :style="jsonLineStyle(index)"
          >
            <span class="line-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span>{{ line }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="scene outro-scene" :style="{ opacity: outroOpacity }">
      <div class="outro-mark"><span /></div>
      <div :style="outroTitleStyle">
        <p class="eyebrow">TRY IT ON YOUR APP TODAY</p>
        <h2>Static signals.<br />Real browser tests.<br /><span>Better UI contracts.</span></h2>
      </div>
      <div class="outro-command" :style="outroCommandStyle">
        <span class="prompt">$</span>
        <span>npx durable-ui scan</span>
        <span class="copy-icon">⌘ C</span>
      </div>
      <p class="course-link" :style="outroCommandStyle">
        docs.sailscasts.com/durable-ui
      </p>
    </section>

    <footer class="footer" :class="{ inverted: darkBackdropOpacity > 0.55 }">
      <span>Durable UI</span>
      <span>Refresh · Back · Sign-in · Recovery</span>
    </footer>
  </main>
</template>

<style>
:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  font-synthesis: none;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

body {
  background: #f5f5f7;
}

.film {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 214, 82, 0.2), transparent 31%),
    radial-gradient(circle at 84% 88%, rgba(120, 140, 255, 0.12), transparent 32%),
    #f5f5f7;
  color: #0b0b0d;
}

.paper-grid {
  position: absolute;
  inset: 0;
  opacity: 0.27;
  background-image:
    linear-gradient(rgba(13, 13, 16, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 13, 16, 0.035) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(circle at center, black, transparent 82%);
}

.ambient {
  position: absolute;
  width: 620px;
  height: 620px;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.22;
}

.ambient-one {
  left: -280px;
  top: -320px;
  background: #ffd64a;
}

.ambient-two {
  right: -300px;
  bottom: -360px;
  background: #7d8cff;
}

.dark-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 115%, rgba(113, 126, 255, 0.22), transparent 38%),
    radial-gradient(circle at 10% 0%, rgba(255, 207, 59, 0.08), transparent 28%),
    #09090b;
}

.masthead,
.footer {
  position: absolute;
  z-index: 20;
  left: 74px;
  right: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(13, 13, 16, 0.62);
  transition: none;
}

.masthead {
  top: 54px;
}

.footer {
  bottom: 45px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.masthead.inverted,
.footer.inverted {
  color: rgba(255, 255, 255, 0.58);
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 17px;
  font-weight: 740;
  letter-spacing: 0.08em;
}

.wordmark-mark,
.mini-mark,
.outro-mark {
  position: relative;
  display: grid;
  place-items: center;
  background: #f3c72f;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.07);
}

.wordmark-mark {
  width: 34px;
  height: 34px;
}

.wordmark-mark span,
.mini-mark span,
.outro-mark span {
  width: 42%;
  height: 42%;
  border: 3px solid #111114;
  border-top-color: transparent;
  border-radius: 50%;
  transform: rotate(-42deg);
}

.version-pill {
  padding: 10px 15px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 720;
  letter-spacing: 0.1em;
}

.scene {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.intro-content {
  position: absolute;
  top: 223px;
  left: 190px;
  width: 1050px;
}

.launch-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border: 1px solid rgba(12, 12, 14, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.05);
  font-size: 18px;
  font-weight: 670;
}

.launch-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f3c72f;
  box-shadow: 0 0 0 6px rgba(243, 199, 47, 0.18);
}

.intro-scene h1 {
  margin: 28px 0 15px;
  font-size: 126px;
  line-height: 0.92;
  letter-spacing: -0.075em;
  font-weight: 760;
}

.intro-scene h1 span,
.outro-scene h2 span {
  color: #a07a00;
}

.intro-subtitle {
  margin: 0;
  color: rgba(14, 14, 16, 0.56);
  font-size: 48px;
  line-height: 1.12;
  letter-spacing: -0.045em;
  font-weight: 560;
}

.command-pill,
.outro-command {
  display: inline-flex;
  align-items: center;
  gap: 17px;
  border: 1px solid rgba(12, 12, 14, 0.11);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 25px 80px rgba(21, 21, 25, 0.11);
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
}

.command-pill {
  margin-top: 42px;
  padding: 18px 21px;
  border-radius: 17px;
  font-size: 22px;
}

.prompt {
  color: #b88c00;
  font-weight: 800;
}

.command-badge {
  margin-left: 12px;
  padding: 8px 11px;
  border-radius: 9px;
  background: #111114;
  color: white;
  font-family: inherit;
  font-size: 13px;
  font-weight: 680;
}

.orbit {
  position: absolute;
  top: 183px;
  right: 135px;
  width: 560px;
  height: 560px;
}

.orbit-ring,
.orbit-core {
  position: absolute;
  border-radius: 50%;
}

.orbit-ring {
  inset: 0;
  border: 1px solid rgba(13, 13, 16, 0.11);
}

.ring-one::before,
.ring-two::before {
  content: "";
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3c72f;
  box-shadow: 0 8px 26px rgba(160, 122, 0, 0.28);
}

.ring-one::before {
  top: 80px;
  right: 55px;
}

.ring-two {
  inset: 76px;
  border-color: rgba(13, 13, 16, 0.08);
  transform: rotate(82deg);
}

.ring-two::before {
  bottom: 23px;
  right: 72px;
  width: 16px;
  height: 16px;
  background: #6f7cff;
}

.orbit-core {
  inset: 155px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #ffd94f, #e9b800);
  box-shadow:
    0 50px 100px rgba(164, 121, 0, 0.24),
    inset 0 0 0 1px rgba(255, 255, 255, 0.48);
}

.orbit-core span {
  width: 72px;
  height: 72px;
  border: 9px solid #111114;
  border-top-color: transparent;
  border-radius: 50%;
  transform: rotate(-42deg);
}

.fit-scene {
  padding: 175px 130px 110px;
}

.section-heading {
  display: grid;
  grid-template-columns: 250px 1fr 540px;
  align-items: end;
  gap: 48px;
}

.eyebrow {
  margin: 0;
  color: rgba(14, 14, 16, 0.46);
  font-size: 15px;
  font-weight: 760;
  letter-spacing: 0.16em;
}

.eyebrow.light {
  color: rgba(255, 255, 255, 0.47);
}

.section-heading h2,
.terminal-heading h2,
.json-copy h2,
.outro-scene h2 {
  margin: 0;
  letter-spacing: -0.06em;
  font-weight: 720;
}

.section-heading h2 {
  font-size: 68px;
  line-height: 0.98;
}

.section-heading > p:last-child {
  margin: 0 0 4px;
  color: rgba(14, 14, 16, 0.52);
  font-size: 26px;
  line-height: 1.33;
  letter-spacing: -0.025em;
}

.fit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 70px;
}

.fit-card {
  position: relative;
  min-height: 465px;
  padding: 38px;
  overflow: hidden;
  border: 1px solid rgba(13, 13, 16, 0.09);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 25px 70px rgba(20, 20, 25, 0.07);
}

.fit-card::after {
  content: "";
  position: absolute;
  right: -95px;
  bottom: -120px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 199, 47, 0.25), transparent 68%);
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(14, 14, 16, 0.38);
  font-size: 15px;
  font-weight: 720;
  letter-spacing: 0.12em;
}

.mini-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
}

.mini-mark span {
  border-width: 2px;
}

.fit-card h3 {
  max-width: 360px;
  margin: 92px 0 20px;
  font-size: 38px;
  line-height: 1.03;
  letter-spacing: -0.048em;
}

.fit-card p {
  max-width: 410px;
  margin: 0;
  color: rgba(14, 14, 16, 0.52);
  font-size: 20px;
  line-height: 1.42;
  letter-spacing: -0.018em;
}

.chip-row,
.integration-row {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.chip-row {
  position: absolute;
  left: 38px;
  bottom: 38px;
}

.chip-row span,
.integration-row span {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 680;
}

.chip-row span {
  background: rgba(13, 13, 16, 0.055);
  color: rgba(13, 13, 16, 0.64);
}

.terminal-scene {
  color: #f5f5f7;
}

.terminal-heading {
  position: absolute;
  top: 148px;
  left: 158px;
}

.terminal-heading h2 {
  margin-top: 13px;
  font-size: 62px;
}

.terminal-heading > p:last-child {
  margin: 13px 0 0;
  color: rgba(255, 255, 255, 0.48);
  font-size: 22px;
}

.terminal-window {
  position: absolute;
  left: 158px;
  right: 158px;
  top: 318px;
  height: 650px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  background: rgba(20, 20, 24, 0.88);
  box-shadow:
    0 55px 130px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(22px);
}

.terminal-chrome {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.48);
  font-size: 15px;
}

.traffic-lights {
  display: flex;
  gap: 9px;
}

.traffic-lights span {
  width: 13px;
  height: 13px;
  border-radius: 50%;
}

.traffic-lights .red { background: #ff5f57; }
.traffic-lights .yellow { background: #febc2e; }
.traffic-lights .green { background: #28c840; }

.terminal-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.terminal-status {
  color: rgba(255, 255, 255, 0.32);
}

.terminal-body {
  padding: 28px 34px;
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
  font-size: 19px;
  line-height: 1.42;
}

.terminal-command {
  display: flex;
  min-height: 34px;
  gap: 14px;
  margin-bottom: 18px;
  color: #f7f7f9;
  font-size: 22px;
  font-weight: 590;
}

.cursor {
  color: #f3c72f;
}

.terminal-line {
  min-height: 27px;
  white-space: pre;
}

.tone-brand { color: #f3c72f; font-weight: 760; }
.tone-muted { color: rgba(255, 255, 255, 0.40); }
.tone-summary { color: #ffffff; font-weight: 700; }
.tone-high { color: #ff7971; font-weight: 720; }
.tone-review { color: #c9a7ff; font-weight: 720; }
.tone-link { color: #78b8ff; }
.tone-evidence { color: rgba(255, 255, 255, 0.5); }
.tone-plain { color: rgba(255, 255, 255, 0.82); }
.tone-good { color: #6de3a4; }
.tone-punctuation { color: rgba(255, 255, 255, 0.62); }

.json-scene {
  display: grid;
  grid-template-columns: 0.84fr 1.16fr;
  align-items: center;
  gap: 88px;
  padding: 132px 140px 105px;
  color: #f5f5f7;
}

.json-copy h2 {
  margin-top: 23px;
  font-size: 69px;
  line-height: 0.99;
}

.json-copy h2 span {
  color: rgba(255, 255, 255, 0.44);
}

.json-copy > p:last-of-type {
  max-width: 590px;
  margin: 30px 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 23px;
  line-height: 1.44;
  letter-spacing: -0.02em;
}

.integration-row {
  margin-top: 34px;
}

.integration-row span {
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-family: "SFMono-Regular", Menlo, monospace;
}

.json-panel {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  background: rgba(18, 18, 22, 0.92);
  box-shadow: 0 55px 140px rgba(0, 0, 0, 0.5);
}

.json-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 67px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.46);
  font-size: 15px;
}

.json-panel-header > div {
  display: flex;
  align-items: center;
  gap: 12px;
}

.json-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f3c72f;
  box-shadow: 0 0 0 5px rgba(243, 199, 47, 0.12);
}

.json-code {
  padding: 26px 22px 30px;
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
  font-size: 18px;
  line-height: 1.57;
}

.json-line {
  display: grid;
  grid-template-columns: 42px 1fr;
  min-height: 28px;
  white-space: pre;
}

.line-number {
  color: rgba(255, 255, 255, 0.18);
  user-select: none;
}

.outro-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.outro-mark {
  width: 74px;
  height: 74px;
  margin-bottom: 30px;
  border-radius: 20px;
  box-shadow: 0 20px 55px rgba(160, 122, 0, 0.24);
}

.outro-mark span {
  border-width: 6px;
}

.outro-scene h2 {
  margin-top: 20px;
  font-size: 86px;
  line-height: 0.98;
}

.outro-command {
  margin-top: 42px;
  padding: 19px 20px 19px 24px;
  border-radius: 18px;
  font-size: 23px;
}

.copy-icon {
  margin-left: 32px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(13, 13, 16, 0.065);
  color: rgba(13, 13, 16, 0.45);
  font-size: 13px;
}

.course-link {
  margin: 25px 0 0;
  color: rgba(13, 13, 16, 0.42);
  font-size: 18px;
  font-weight: 610;
  letter-spacing: -0.01em;
}
</style>
