'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import './how-it-works-flow.css';

/* The animated call-path diagram, ported from the marketing repo
   (marketing/how-it-works). The drawing and the copy are declarative JSX; the
   choreography — packets in flight, the camera on a phone, the logs — is the
   original imperative engine, run inside an effect over the rendered DOM. It
   never creates or removes nodes React owns, only toggles classes, inline
   transforms and the text of the log rows and the two footer buttons. */

/* Structure is language-independent: which node a source hangs off, and whether
   it is a trigger or a tool. Every connector and every device carries both
   kinds: a device raises triggers (a watched file, a geofence) just as a
   connector does. */
const SRC_META: Record<string, { node: string; trigger: boolean }> = {
  c1: { node: 'n1', trigger: false },
  c2: { node: 'n1', trigger: true },
  c3: { node: 'n2', trigger: true },
  c7: { node: 'n2', trigger: false },
  c4: { node: 'n3', trigger: true },
  c5: { node: 'n3', trigger: false },
  c6: { node: 'n4', trigger: true },
  c8: { node: 'n4', trigger: false },
};
const NODE_KIND: Record<string, 'connector' | 'device'> = {
  n1: 'connector',
  n2: 'device',
  n3: 'connector',
  n4: 'device',
};
/* Connectors and devices carry the name of what they are: the label on the
   diagram, the value in the log, the word in a tooltip. Not translated — a name
   is a name, like Telegram. Agent names are the user's own, so those live in
   the message files. */
const NODE_NAME: Record<string, string> = { n1: 'Mail', n2: 'Laptop', n3: 'Calendar', n4: 'Android' };
const SCREEN_IDS = ['s1', 's2', 's3', 's4'];

/* Path geometry inside the core, in world coordinates of the one 1160×600 drawing. */
const WIDE = {
  entry: 'M452 297 L602 297',
  toRouter: 'M602 297 L602 353',
  routerOut: 'M602 353 L752 353',
  toRules: 'M752 353 C700 353 640 322 602 297',
  deniedTrig: 'M602 297 C520 300 466 330 462 470 C460 512 456 536 452 556',
  deniedTool: 'M602 297 C700 300 740 336 748 470 C752 512 756 536 760 556',
  resultBack: 'M452 297 C462 400 470 420 520 424 C620 430 700 400 752 353',
  back: 'M752 353 C700 353 630 300 602 205',
  screens: {
    s1: 'M602 205 C602 150 470 118 444 70',
    s2: 'M602 205 C602 150 556 108 544 70',
    s3: 'M602 205 C602 150 644 108 644 70',
    s4: 'M602 205 C602 150 728 118 744 70',
  } as Record<string, string>,
  agents: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
};

/* The tail's dash pattern, read from the far end towards the packet: short ticks
   that grow into one long stroke right behind it. The last value is filled in at
   runtime with a gap longer than the segment, so the group never repeats. */
const TAIL_DASHES = [4, 8, 6, 8, 8, 8, 12, 8, 18, 8, 28];
const TAIL_SPAN = TAIL_DASHES.reduce((a, b) => a + b, 0); /* 116 user units */

/* Several journeys are in the air at once, each with its own packet, its own
   tail and its own colour — so a trigger arriving can be warm while, on the
   other side of the core, another agent's tool call is already cool. */
const CONCURRENCY = 3;
const RUN_STAGGER = 3400;

/* The diagram is the same drawing at every width. On a phone it is shown through
   a small window of it and the view rides along the path with the packet, so the
   arrangement never changes — only the crop. The window size is the zoom: 340
   world units across a ~362px screen puts a node label at about 13px instead of 4px. */
const WORLD: [number, number] = [1160, 600];
const CAM_WIN: [number, number] = [340, 450];

interface FlowAgent {
  name: string;
  model: string;
  access: string;
  skills: string;
}
interface FlowSource {
  kind: string;
  what: string;
}
interface FlowTip {
  title: string;
  body: string;
}
interface FlowStrings {
  ui: Record<string, string>;
  agentTip: (name: string) => string;
  agents: Record<string, FlowAgent>;
  sources: Record<string, FlowSource>;
  tips: Record<string, FlowTip>;
}

type Flight = {
  el: Element;
  greek: string;
  pkt: SVGGElement;
  trail: SVGPathElement;
  kind: string;
};

function runEngine(root: HTMLElement, T: () => FlowStrings): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 767px)');
  const canMotionPath =
    window.CSS && CSS.supports && CSS.supports('offset-path', 'path("M0 0 L1 1")');

  /* ================================ plumbing ============================= */
  let gen = 0;
  let paused = false;
  let inView = false;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const alive = (g: number) => g === gen && !paused && inView && !reduced.matches;

  const svgEl = root.querySelector<SVGSVGElement>('.hiw__canvas')!;
  const activeSvg = () => svgEl;
  const geo = () => WIDE;
  const edge = (from: string, to: string) =>
    activeSvg().querySelector<SVGPathElement>(
      '.edge[data-from="' + from + '"][data-to="' + to + '"]'
    );

  /* A filling animation is retained for as long as it fills, so re-animating the
     same element every segment piles them up. Drop the previous one first. */
  function animateOn(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    if (el.getAnimations) el.getAnimations().forEach((a) => a.cancel());
    return el.animate(frames, opts);
  }

  let camNow = 'translate(0px, 0px)';
  let explore = false;

  const camActive = () => narrow.matches && !reduced.matches && !explore;
  const camG = () => root.querySelector<SVGGElement>('[data-cam]');

  /* Centre a world point, clamped so the view never runs off the drawing. */
  function camXY(px: number, py: number) {
    const w = CAM_WIN[0],
      h = CAM_WIN[1];
    const tx = Math.min(0, Math.max(w - WORLD[0], w / 2 - px));
    const ty = Math.min(0, Math.max(h - WORLD[1], h / 2 - py));
    return 'translate(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px)';
  }
  function camTo(px: number, py: number, dur?: number) {
    if (!camActive()) return;
    const to = camXY(px, py);
    if (to === camNow) return;
    const from = camNow;
    camNow = to;
    const g = camG();
    if (!g) return;
    animateOn(g, [{ transform: from }, { transform: to }], {
      duration: dur || 600,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards',
    });
  }
  /* Ride a segment: sample the path and hand the samples to the same timeline the
     packet uses. Transit easing is linear, so uniform samples track it exactly. */
  function camFollow(pathEl: SVGPathElement | null, dur: number, reverse?: boolean) {
    if (!camActive() || !pathEl) return;
    const L = pathEl.getTotalLength();
    if (!L) return;
    const N = 14,
      frames: Keyframe[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const pt = pathEl.getPointAtLength((reverse ? 1 - t : t) * L);
      frames.push({ transform: camXY(pt.x, pt.y) });
    }
    camNow = frames[N].transform as string;
    const g = camG();
    if (!g) return;
    animateOn(g, frames, { duration: dur, easing: 'linear', fill: 'forwards' });
  }
  function camReset() {
    const g = camG();
    if (g && g.getAnimations) g.getAnimations().forEach((a) => a.cancel());
    camNow = 'translate(0px, 0px)';
  }
  function applyViewBox() {
    const win = camActive() ? CAM_WIN : WORLD;
    svgEl.setAttribute('viewBox', '0 0 ' + win[0] + ' ' + win[1]);
  }
  /* Explore: the whole diagram at its own size inside a scrollable stage, panned by
     hand. Zooming out to fit would put the labels at 4px, which is not an overview. */
  function setExplore(v: boolean) {
    explore = v;
    const st = root.querySelector('.hiw__stage');
    if (st) st.classList.toggle('is-explore', v);
    camReset();
    applyViewBox();
    const btn = root.querySelector('[data-whole]');
    if (btn) btn.textContent = v ? T().ui.windowed : T().ui.whole;
  }

  const stagecap = root.querySelector<HTMLElement>('[data-stagecap]');
  function setStage(key: string, kind?: string) {
    if (!stagecap) return;
    if (kind) stagecap.style.setProperty('--flow', 'var(--flow-' + kind + ')');
    stagecap.innerHTML = '<b></b>';
    (stagecap.firstChild as HTMLElement).textContent = T().ui[key] || '';
  }

  function flights(): Flight[] {
    return Array.from(activeSvg().querySelectorAll('[data-flight]')).map((el) => ({
      el,
      greek: (el as SVGGElement).dataset.greek || '',
      pkt: el.querySelector<SVGGElement>('[data-pkt]')!,
      trail: el.querySelector<SVGPathElement>('[data-trail]')!,
      kind: 'tool',
    }));
  }

  /* Colour is per flight, not global: with several packets in the air a single
     shared variable would make them all flicker to whichever leg moved last. */
  function setKind(f: Flight, kind: string) {
    f.kind = kind;
    const v = 'var(--flow-' + kind + ')';
    f.pkt.style.setProperty('--flow', v);
    f.trail.style.setProperty('--flow', v);
  }

  /* Packet flight. offset-distance resolves to a transform; the tail is the same
     segment drawn as a dash group sliding along it with stroke-dashoffset. The
     packet sits at path position p, the group occupies [p - span, p] going forward
     or [p, p + span] reversed — hence the flipped pattern, so the long stroke is
     always the one next to the packet. */
  function travel(
    f: Flight,
    pathD: string | null | undefined,
    dur: number,
    opts?: { reverse?: boolean; bad?: boolean; easing?: string }
  ): Promise<unknown> {
    const o = opts || {};
    if (!f || !f.pkt || !pathD) return Promise.resolve();
    if (!canMotionPath) return sleep(dur);

    const path = 'path("' + pathD + '")';
    const easing = o.easing || 'linear';
    const frames: Keyframe[] = [
      { offsetDistance: o.reverse ? '100%' : '0%' },
      { offsetDistance: o.reverse ? '0%' : '100%' },
    ];

    f.pkt.style.setProperty('offset-path', path);
    f.pkt.style.setProperty('offset-rotate', '0deg');
    f.pkt.classList.add('is-visible');
    f.pkt.classList.toggle('is-bad', !!o.bad);

    if (f.trail) f.trail.setAttribute('d', pathD);
    camFollow(f.trail, dur, o.reverse);

    if (f.trail && !reduced.matches) {
      const L = f.trail.getTotalLength();
      const span = TAIL_SPAN;
      const dashes = o.reverse ? TAIL_DASHES.slice().reverse() : TAIL_DASHES;
      f.trail.style.strokeDasharray = dashes.join(' ') + ' ' + (L + span);
      f.trail.classList.add('is-visible');
      f.trail.classList.toggle('is-bad', !!o.bad);
      const off = o.reverse ? [-L, 0] : [span, span - L];
      animateOn(
        f.trail,
        [{ strokeDashoffset: String(off[0]) }, { strokeDashoffset: String(off[1]) }],
        { duration: dur, easing, fill: 'forwards' }
      );
    }

    const anim = animateOn(f.pkt, frames, { duration: dur, easing, fill: 'forwards' });
    return anim.finished.catch(() => {});
  }

  function hideFlight(f: Flight) {
    if (!f) return;
    if (f.pkt) f.pkt.classList.remove('is-visible', 'is-bad');
    if (f.trail) f.trail.classList.remove('is-visible', 'is-bad');
  }
  function hideAll() {
    root
      .querySelectorAll('[data-pkt], [data-trail]')
      .forEach((el) => el.classList.remove('is-visible', 'is-bad'));
  }

  /* A shared element lit by whichever flight reached it last. */
  function flash(el: Element | null, cls: string, ms: number, kind?: string) {
    if (!el) return;
    if (kind) (el as HTMLElement).style.setProperty('--flow', 'var(--flow-' + kind + ')');
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }
  function hot(edgeEl: SVGPathElement | null, kind: string) {
    if (!edgeEl) return;
    edgeEl.style.setProperty('--flow', 'var(--flow-' + kind + ')');
    edgeEl.classList.add('is-hot');
  }
  function cool(edgeEl: SVGPathElement | null, ms?: number) {
    if (edgeEl) setTimeout(() => edgeEl.classList.remove('is-hot'), ms || 0);
  }

  /* Dimming the agents that are not busy is reference counted: three flights
     come and go independently. */
  let routedCount = 0;
  function enterRouted() {
    routedCount++;
    root.classList.add('is-routed');
  }
  function leaveRouted() {
    routedCount = Math.max(0, routedCount - 1);
    if (!routedCount) root.classList.remove('is-routed');
  }

  /* ================================== logs =============================== */
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  function stamp() {
    const d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  interface LogEntry {
    time?: string;
    node: string;
    src: string;
    greek?: string;
    agent?: string;
    ok: boolean;
  }

  /* The two logs hold different things, so they print different rows:
       triggers — time, the connector or device it came from, its name, and the
                  Greek name of the packet that carried it;
       tool calls — time, the agent that asked, the connector or device it went
                  to, and the tool.
     The verdict closes both: it is the whole point of the check. */
  function makeLog(kind: 'trigger' | 'tool') {
    const rows = Array.from(root.querySelectorAll('[data-log="' + kind + '"] .hiw__row'));
    const entries: LogEntry[] = [];
    function cell(cls: string, text: string) {
      return '<span class="' + cls + '">' + text + '</span>';
    }
    function render() {
      const ui = T().ui;
      /* A connector or device goes in by name alone — the column it sits in already
         says what it is. The agent keeps its word, since its name is a free-form one. */
      const nodeLabel = (nid: string) => NODE_NAME[nid];
      const agentLabel = (aid: string) => ui.agent + ' ' + T().agents[aid].name;
      rows.forEach((row, i) => {
        const e = entries[i];
        if (!e) {
          row.textContent = '';
          return;
        }
        const what = T().sources[e.src].what;
        const html =
          kind === 'trigger'
            ? cell('hiw__time', e.time || '') +
              cell('hiw__id', nodeLabel(e.node)) +
              cell('hiw__what', what) +
              cell('hiw__id', e.greek || '')
            : cell('hiw__time', e.time || '') +
              cell('hiw__id', agentLabel(e.agent || '')) +
              cell('hiw__id', nodeLabel(e.node)) +
              cell('hiw__what', what);
        row.innerHTML =
          html +
          '<span class="hiw__verdict" data-v="' +
          (e.ok ? 'ok' : 'bad') +
          '">' +
          (e.ok ? ui.allowed : ui.denied) +
          '</span>';
      });
    }
    return {
      add(e: LogEntry) {
        entries.unshift(Object.assign({ time: stamp() }, e));
        entries.length = Math.min(entries.length, 3);
        render();
        flash(rows[0], 'hiw__row--enter', 340);
      },
      render,
    };
  }
  const logTrigger = makeLog('trigger');
  const logTool = makeLog('tool');

  /* ================================= cycle =============================== */
  let cycleNo = 0;

  /* The packet "enters" a node: rather than jumping across the node's body,
     it is hidden while the connector or device handles the call. */
  async function enterNode(f: Flight, nodeEl: Element | null, chipEl: Element | null, ms: number) {
    hideFlight(f);
    flash(nodeEl, 'is-hot', 760, f.kind);
    if (chipEl) flash(chipEl, 'is-hot', 760, f.kind);
    await sleep(ms);
  }

  async function runCycle(f: Flight, g: number) {
    const G = geo();
    const svg = activeSvg();
    const q1 = (id: string) => svg.querySelector('[data-node="' + id + '"]');
    const has = (id: string) => !!q1(id);

    const trigIds = Object.keys(SRC_META).filter((id) => SRC_META[id].trigger && has(id));
    const toolIds = Object.keys(SRC_META).filter((id) => !SRC_META[id].trigger && has(id));
    const i = cycleNo++;
    const trigId = trigIds[i % trigIds.length];
    const toolId = toolIds[i % toolIds.length];
    const agentId = G.agents[i % G.agents.length];
    const screenId = SCREEN_IDS[i % SCREEN_IDS.length];
    /* every third run is a refusal, alternating between the trigger and the tool call */
    const deny = i % 3 === 2 ? (i % 6 === 2 ? 'trigger' : 'tool') : null;

    const trigNode = SRC_META[trigId].node;
    const toolNode = SRC_META[toolId].node;

    const chipT = q1(trigId),
      nodeT = q1(trigNode);
    const chipX = q1(toolId),
      nodeX = q1(toolNode);
    const rules = svg.querySelector('[data-plate="rules"]');
    const router = svg.querySelector('[data-plate="router"]');
    const key = svg.querySelector('[data-key]');
    const keynote = svg.querySelector('[data-keynote]');
    const agent = q1(agentId),
      screen = q1(screenId);
    const eChipT = edge(trigId, trigNode);
    const eNodeT = edge(trigNode, 'core');
    const eNodeX = edge(toolNode, 'core');
    const eAgent = edge('core', agentId);

    /* ---- 1. Trigger: source → connector/device → core ---- */
    setKind(f, 'trigger');
    setStage('stTrigger', 'trigger');
    if (chipT && camActive()) {
      const bb = (chipT as SVGGraphicsElement).getBBox();
      camTo(bb.x + bb.width / 2, bb.y + bb.height / 2, 480);
      await sleep(340);
      if (!alive(g)) return;
    }
    flash(chipT, 'is-hot', 760, f.kind);
    hot(eChipT, f.kind);
    await travel(f, eChipT && eChipT.getAttribute('d'), 400);
    if (!alive(g)) return;
    await enterNode(f, nodeT, null, 180);
    if (!alive(g)) return;
    cool(eChipT);

    hot(eNodeT, f.kind);
    await travel(f, eNodeT && eNodeT.getAttribute('d'), 550);
    if (!alive(g)) return;
    cool(eNodeT, 400);

    /* ---- 2. Policy: the trigger is checked ---- */
    setStage('stPolicy', 'trigger');
    await travel(f, G.entry, 380);
    if (!alive(g)) return;
    await sleep(240);
    if (!alive(g)) return;

    if (deny === 'trigger') {
      flash(rules, 'is-bad', 740);
      setStage('stDenied', 'trigger');
      await sleep(150);
      if (!alive(g)) return;
      await travel(f, G.deniedTrig, 640, { bad: true, easing: 'cubic-bezier(.4,0,.7,1)' });
      hideFlight(f);
      logTrigger.add({ node: trigNode, src: trigId, greek: f.greek, ok: false });
      await sleep(1500);
      return;
    }
    flash(rules, 'is-ok', 740);

    /* ---- 3. Routing: to one specific agent ---- */
    setStage('stRouting', 'trigger');
    await travel(f, G.toRouter, 300);
    if (!alive(g)) return;
    flash(router, 'is-routing', 900, f.kind);
    await travel(f, G.routerOut, 220);
    if (!alive(g)) return;

    hot(eAgent, f.kind);
    enterRouted();
    let routed = true;
    try {
      await travel(f, eAgent && eAgent.getAttribute('d'), 720);
      if (!alive(g)) return;
      hideFlight(f);
      if (agent) agent.classList.add('is-hot');
      logTrigger.add({ node: trigNode, src: trigId, greek: f.greek, ok: true });
      await sleep(450);
      if (!alive(g)) return; /* the agent works on the trigger */

      /* ---- 4. The agent calls a tool: back into the core, to the Policy ---- */
      setKind(f, 'tool');
      setStage('stTool', 'tool');
      await travel(f, eAgent && eAgent.getAttribute('d'), 620, { reverse: true });
      if (!alive(g)) return;
      await travel(f, G.toRules, 320);
      if (!alive(g)) return;
      await sleep(200);
      if (!alive(g)) return;

      if (deny === 'tool') {
        flash(rules, 'is-bad', 740);
        setStage('stDenied', 'tool');
        await sleep(150);
        if (!alive(g)) return;
        await travel(f, G.deniedTool, 640, { bad: true, easing: 'cubic-bezier(.4,0,.7,1)' });
        hideFlight(f);
        logTool.add({ agent: agentId, node: toolNode, src: toolId, ok: false });
        await sleep(700);
        if (!alive(g)) return;
      } else {
        flash(rules, 'is-ok', 740);

        /* the credential is attached here, and stays here */
        flash(key, 'is-lit', 900, f.kind);
        if (keynote) {
          keynote.classList.add('is-shown');
          setTimeout(() => keynote.classList.remove('is-shown'), 2200);
        }
        await sleep(280);
        if (!alive(g)) return;

        /* core → connector/device, the tool runs, the result comes back */
        await travel(f, G.entry, 300, { reverse: true });
        if (!alive(g)) return;
        hot(eNodeX, f.kind);
        await travel(f, eNodeX && eNodeX.getAttribute('d'), 480, { reverse: true });
        if (!alive(g)) return;
        await enterNode(f, nodeX, chipX, 320);
        if (!alive(g)) return;
        await travel(f, eNodeX && eNodeX.getAttribute('d'), 480);
        if (!alive(g)) return;
        cool(eNodeX, 400);
        logTool.add({ agent: agentId, node: toolNode, src: toolId, ok: true });

        /* the result travels through the core back to the agent */
        await travel(f, G.resultBack, 580);
        if (!alive(g)) return;
        await travel(f, eAgent && eAgent.getAttribute('d'), 660);
        if (!alive(g)) return;
        hideFlight(f);
        await sleep(300);
        if (!alive(g)) return;
      }

      /* ---- 5. The agent answers: through the core, into a messenger ---- */
      setKind(f, 'reply');
      setStage('stAnswer', 'reply');
      await travel(f, eAgent && eAgent.getAttribute('d'), 600, { reverse: true });
    } finally {
      if (routed) {
        leaveRouted();
        routed = false;
      }
      if (agent) agent.classList.remove('is-hot');
      cool(eAgent);
    }
    if (!alive(g)) return;

    await travel(f, G.back, 380);
    if (!alive(g)) return;
    /* the answer surfaces in the user channel before it leaves for a messenger */
    const channel = svg.querySelector('[data-plate="channel"]');
    flash(channel, 'is-routing', 900, f.kind);
    await sleep(180);
    if (!alive(g)) return;
    const eScreen = edge('core', screenId);
    hot(eScreen, f.kind);
    await travel(f, G.screens[screenId], 460);
    if (!alive(g)) return;
    hideFlight(f);
    flash(screen, 'is-hot', 900, f.kind);
    cool(eScreen, 700);

    await sleep(900);
  }

  async function runner(f: Flight, g: number, delay: number) {
    await sleep(delay);
    while (g === gen) {
      if (!alive(g)) {
        await sleep(200);
        continue;
      }
      try {
        await runCycle(f, g);
      } catch {
        await sleep(400);
      }
      if (g !== gen) return;
      hideFlight(f);
    }
  }

  function loop() {
    const g = gen;
    const fl = flights();
    /* The camera follows one journey, so the narrow layout runs a single packet. */
    const n = Math.min(narrow.matches ? 1 : CONCURRENCY, fl.length);
    for (let k = 0; k < n; k++) runner(fl[k], g, k * RUN_STAGGER);
  }

  function restart() {
    gen++;
    camReset();
    hideAll();
    routedCount = 0;
    root.classList.remove('is-routed');
    root.querySelectorAll('.is-hot').forEach((el) => el.classList.remove('is-hot'));
    loop();
  }

  /* ========================== pause and visibility ======================= */
  const pauseBtn = root.querySelector<HTMLElement>('[data-pause]');
  function setPaused(v: boolean) {
    paused = v;
    root.classList.toggle('is-paused', v);
    if (pauseBtn) pauseBtn.textContent = v ? T().ui.resume : T().ui.pause;
    if (!v) restart();
  }
  const onPause = () => setPaused(!paused);
  if (pauseBtn) pauseBtn.addEventListener('click', onPause);

  const wholeBtn = root.querySelector<HTMLElement>('[data-whole]');
  const onWhole = () => setExplore(!explore);
  if (wholeBtn) wholeBtn.addEventListener('click', onWhole);

  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (es) => {
        inView = es.some((e) => e.isIntersecting);
      },
      { threshold: 0.15 }
    );
    io.observe(root);
  } else {
    inView = true;
  }

  const onNarrow = () => {
    applyViewBox();
    restart();
  };
  narrow.addEventListener('change', onNarrow);

  /* ============================== node focus ============================= */
  let picked: string | null = null;
  function clearFocus() {
    picked = null;
    root.classList.remove('is-focus');
    root
      .querySelectorAll('.is-picked, .is-related')
      .forEach((el) => el.classList.remove('is-picked', 'is-related'));
    setPaused(false);
  }
  function focusNode(id: string) {
    if (picked === id) {
      clearFocus();
      return;
    }
    root
      .querySelectorAll('.is-picked, .is-related')
      .forEach((el) => el.classList.remove('is-picked', 'is-related'));
    picked = id;
    root.classList.add('is-focus');
    root
      .querySelectorAll('[data-node="' + id + '"]')
      .forEach((el) => el.classList.add('is-picked'));
    root.querySelectorAll<SVGPathElement>('.edge').forEach((e) => {
      if (e.dataset.from === id || e.dataset.to === id) e.classList.add('is-related');
    });
    setPaused(true);
  }

  const onClick = (ev: MouseEvent) => {
    const n = (ev.target as Element).closest<SVGGElement>('.node');
    if (n && n.dataset.node) {
      focusNode(n.dataset.node);
      return;
    }
    if (!(ev.target as Element).closest('.hiw__btn')) clearFocus();
  };
  root.addEventListener('click', onClick);

  /* ================================ tooltips ============================= */
  const tip = root.querySelector<HTMLElement>('.hiw__tip')!;
  const stage = root.querySelector<HTMLElement>('.hiw__stage')!;
  function showTip(target: Element, id: string) {
    const t = T(),
      ui = t.ui;
    const a = t.agents[id];
    if (a) {
      tip.innerHTML =
        '<b></b><dl><dt class="l1"></dt><dd class="m"></dd>' +
        '<dt class="l2"></dt><dd class="ac"></dd><dt class="l3"></dt><dd class="sk"></dd></dl>';
      tip.querySelector('b')!.textContent = t.agentTip(a.name);
      tip.querySelector('.l1')!.textContent = ui.model;
      tip.querySelector('.l2')!.textContent = ui.access;
      tip.querySelector('.l3')!.textContent = ui.skills;
      tip.querySelector('.m')!.textContent = a.model;
      tip.querySelector('.ac')!.textContent = a.access;
      tip.querySelector('.sk')!.textContent = a.skills;
    } else {
      let info: FlowTip | null = null;
      if (id === 'rules' || id === 'channel') info = t.tips[id];
      else if (NODE_KIND[id])
        info = {
          title: t.tips[NODE_KIND[id]].title + ' ' + NODE_NAME[id],
          body: t.tips[NODE_KIND[id]].body,
        };
      else if (t.sources[id]) info = { title: t.sources[id].kind, body: t.sources[id].what };
      if (!info) return;
      tip.innerHTML = '<b></b><p></p>';
      tip.querySelector('b')!.textContent = info.title;
      tip.querySelector('p')!.textContent = info.body;
    }

    const sr = stage.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const tw = tip.offsetWidth,
      th = tip.offsetHeight;
    let x = tr.left - sr.left + tr.width / 2 - tw / 2;
    let y = tr.top - sr.top - th - 10;
    if (y < 6) y = tr.bottom - sr.top + 10;
    x = Math.max(8, Math.min(x, sr.width - tw - 8));
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
    tip.classList.add('is-shown');
  }
  const hideTip = () => tip.classList.remove('is-shown');

  const onOver = (ev: MouseEvent) => {
    const t = (ev.target as Element).closest<SVGElement>('[data-tip]');
    if (t && t.dataset.tip) showTip(t, t.dataset.tip);
  };
  const onOut = (ev: MouseEvent) => {
    const rel = ev.relatedTarget as Element | null;
    if (!rel || !rel.closest || !rel.closest('[data-tip]')) hideTip();
  };
  root.addEventListener('mouseover', onOver);
  root.addEventListener('mouseout', onOut);

  /* ====================== static frame, no motion ======================== */
  function staticFrame() {
    ['c2', 'n1'].forEach((id) => {
      const el = svgEl.querySelector('[data-node="' + id + '"]');
      if (el) el.classList.add('is-static-hot');
    });
    const a = svgEl.querySelector('[data-node="a4"]') || svgEl.querySelector('[data-node="a2"]');
    if (a) a.classList.add('is-static-hot');
    const s = svgEl.querySelector('[data-node="s2"]');
    if (s) s.classList.add('is-static-hot');
    ['c2|n1', 'n1|core', 'core|a4', 'core|a2', 'core|s2'].forEach((pair) => {
      const [from, to] = pair.split('|');
      const e = edge(from, to);
      if (e) e.classList.add('is-static-path');
    });
    /* the frozen frame shows a trigger's path, so the whole section reads warm */
    root.style.setProperty('--flow', 'var(--flow-trigger)');
    logTrigger.add({ node: 'n4', src: 'c6', greek: 'γ', ok: false });
    logTrigger.add({ node: 'n2', src: 'c3', greek: 'β', ok: true });
    logTrigger.add({ node: 'n1', src: 'c2', greek: 'α', ok: true });
    logTool.add({ agent: 'a6', node: 'n2', src: 'c7', ok: false });
    logTool.add({ agent: 'a2', node: 'n3', src: 'c5', ok: true });
    logTool.add({ agent: 'a4', node: 'n1', src: 'c1', ok: true });
    if (pauseBtn) pauseBtn.remove();
  }

  /* ================================= start =============================== */
  /* Without motion there is no camera to follow, and the full drawing squeezed
     into a phone would be 4px type — so that case gets the scrollable full-size
     view instead. */
  if (reduced.matches && narrow.matches) setExplore(true);
  else applyViewBox();
  if (reduced.matches) staticFrame();
  else loop();

  return () => {
    gen++; /* runners check their generation at every await and exit */
    if (io) io.disconnect();
    narrow.removeEventListener('change', onNarrow);
    root.removeEventListener('click', onClick);
    root.removeEventListener('mouseover', onOver);
    root.removeEventListener('mouseout', onOut);
    if (pauseBtn) pauseBtn.removeEventListener('click', onPause);
    if (wholeBtn) wholeBtn.removeEventListener('click', onWhole);
  };
}

export default function HowItWorksFlow() {
  const t = useTranslations('HomePage.howItWorks');
  const locale = useLocale();
  const rootRef = useRef<HTMLElement>(null);

  const data: FlowStrings = useMemo(
    () => ({
      ui: {
        rules: t('rules'),
        routing: t('routing'),
        agent: t('agent'),
        channel: t('channel'),
        keynote: t('keynote'),
        allowed: t('allowed'),
        denied: t('denied'),
        pause: t('pause'),
        resume: t('resume'),
        whole: t('whole'),
        windowed: t('windowed'),
        stTrigger: t('stTrigger'),
        stPolicy: t('stPolicy'),
        stRouting: t('stRouting'),
        stTool: t('stTool'),
        stAnswer: t('stAnswer'),
        stDenied: t('stDenied'),
        model: t('model'),
        access: t('access'),
        skills: t('skills'),
      },
      agentTip: (name: string) => t('agentTip', { name }),
      /* `t.raw`'s typed keys stop at "namespace" objects (nested records of
         strings), which these three legitimately are — hence the loose call. */
      agents: (t.raw as unknown as (k: string) => unknown)('agents') as Record<string, FlowAgent>,
      sources: (t.raw as unknown as (k: string) => unknown)('sources') as Record<string, FlowSource>,
      tips: (t.raw as unknown as (k: string) => unknown)('tips') as Record<string, FlowTip>,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );
  /* The engine reads strings through a ref so a parent re-render never restarts
     the choreography; only a locale change does (via the effect dependency). */
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return runEngine(root, () => dataRef.current);
  }, [locale]);

  const agents = data.agents;
  const chipLabel = (id: string) => (SRC_META[id].trigger ? t('trigger') : t('tool'));

  /* Source chips: a tool is a plain rect with two notches, a trigger is an
     arrow-ended flag — the shapes come from the source drawing verbatim. */
  const toolChip = (id: string, y: number) => (
    <g className="node chip chip--tool" data-node={id} data-tip={id}>
      <rect className="shape" x="20" y={y} width="140" height="26" rx="5" />
      <rect className="glow" x="20" y={y} width="140" height="26" rx="5" />
      <path className="notch" d={`M32 ${y} V${y + 26} M148 ${y} V${y + 26}`} />
      <text className="n-chip" x="90" y={y + 17} textAnchor="middle">
        {chipLabel(id)}
      </text>
    </g>
  );
  const triggerChip = (id: string, y: number) => {
    const d = `M20 ${y} H146 L160 ${y + 13} L146 ${y + 26} H20 Z`;
    return (
      <g className="node chip chip--trigger" data-node={id} data-tip={id}>
        <path className="shape" d={d} />
        <path className="glow" d={d} />
        <text className="n-chip" x="86" y={y + 17} textAnchor="middle">
          {chipLabel(id)}
        </text>
      </g>
    );
  };

  const hexAgent = (id: string, cx: number, cy: number) => {
    const pts = `${cx - 44},${cy} ${cx - 22},${cy - 26} ${cx + 22},${cy - 26} ${cx + 44},${cy} ${cx + 22},${cy + 26} ${cx - 22},${cy + 26}`;
    return (
      <g className="node hex" data-node={id} data-tip={id}>
        <polygon className="shape" points={pts} />
        <polygon className="glow" points={pts} />
        <text className="n-hex" x={cx} y={cy + 4} textAnchor="middle">
          {agents[id]?.name}
        </text>
      </g>
    );
  };

  const screenNode = (id: string, x: number, label: string) => (
    <g className="node screen" data-node={id}>
      <rect className="shape" x={x} y="26" width="76" height="44" rx="9" />
      <rect className="glow" x={x} y="26" width="76" height="44" rx="9" />
      <text className="n-screen" x={x + 38} y="52" textAnchor="middle">
        {label}
      </text>
    </g>
  );

  const flight = (greek: string) => (
    <g className="flight" data-flight data-greek={greek}>
      <path className="trail" data-trail />
      <g className="pkt" data-pkt>
        <circle className="halo" cx="0" cy="0" r="8" />
        <circle className="core-dot" cx="0" cy="0" r="4" />
        <text className="pkt-name" x="0" y="-12" textAnchor="middle" style={{ fontSize: '10.5px' }}>
          {greek}
        </text>
      </g>
    </g>
  );

  return (
    <section
      ref={rootRef}
      id="how-it-works"
      className="hiw mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20"
      aria-labelledby="hiw-title"
    >
      <p className="hiw__eyebrow">{t('eyebrow')}</p>
      <h2 className="hiw__lede" id="hiw-title">
        {t('lede')}
      </h2>
      <div className="hiw__rule" />
      <p className="hiw__intro">{t('intro')}</p>

      <p className="hiw__sr">{t('sr')}</p>

      <div className="hiw__stage">
        <svg className="hiw__canvas" viewBox="0 0 1160 600" aria-hidden="true" focusable="false">
          <defs>
            <pattern
              id="hatch45"
              width="12"
              height="12"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="12" stroke="var(--hatch)" strokeWidth="11" />
            </pattern>
          </defs>

          <g className="cam" data-cam>
            <g className="edges">
              <path className="edge edge--live" data-from="c1" data-to="n1" d="M160 189 C180 189 180 205 200 205" />
              <path className="edge edge--live" data-from="c2" data-to="n1" d="M160 221 C180 221 180 205 200 205" style={{ animationDelay: '-1.1s' }} />
              <path className="edge edge--live" data-from="c3" data-to="n2" d="M160 263 C180 263 180 279 200 279" style={{ animationDelay: '-2.0s' }} />
              <path className="edge edge--live" data-from="c7" data-to="n2" d="M160 295 C180 295 180 279 200 279" style={{ animationDelay: '-2.9s' }} />
              <path className="edge edge--live" data-from="c4" data-to="n3" d="M160 349 C180 349 180 365 200 365" style={{ animationDelay: '-3.6s' }} />
              <path className="edge edge--live" data-from="c5" data-to="n3" d="M160 381 C180 381 180 365 200 365" style={{ animationDelay: '-4.4s' }} />
              <path className="edge edge--live" data-from="c6" data-to="n4" d="M160 425 C180 425 180 441 200 441" style={{ animationDelay: '-5.1s' }} />
              <path className="edge edge--live" data-from="c8" data-to="n4" d="M160 457 C180 457 180 441 200 441" style={{ animationDelay: '-5.8s' }} />
              <path className="edge edge--live" data-from="n1" data-to="core" d="M332 205 C392 205 392 297 452 297" style={{ animationDelay: '-0.6s' }} />
              <path className="edge edge--live" data-from="n2" data-to="core" d="M332 279 C392 279 392 297 452 297" style={{ animationDelay: '-1.9s' }} />
              <path className="edge edge--live" data-from="n3" data-to="core" d="M332 365 C392 365 392 297 452 297" style={{ animationDelay: '-3.1s' }} />
              <path className="edge edge--live" data-from="n4" data-to="core" d="M332 441 C392 441 392 297 452 297" style={{ animationDelay: '-4.2s' }} />

              <path className="edge" data-from="core" data-to="a1" d="M752 353 C830 353 870 120 948 82" />
              <path className="edge" data-from="core" data-to="a2" d="M752 353 C840 353 900 200 1008 177" />
              <path className="edge" data-from="core" data-to="a3" d="M752 353 C850 353 930 285 1040 272" />
              <path className="edge" data-from="core" data-to="a4" d="M752 353 C860 353 950 370 1040 368" />
              <path className="edge" data-from="core" data-to="a5" d="M752 353 C840 353 900 450 1008 463" />
              <path className="edge" data-from="core" data-to="a6" d="M752 353 C830 353 870 530 948 558" />

              <path className="edge edge--live" data-from="core" data-to="s1" d="M602 205 C602 150 470 118 444 70" style={{ animationDelay: '-2.7s' }} />
              <path className="edge edge--live" data-from="core" data-to="s2" d="M602 205 C602 150 556 108 544 70" style={{ animationDelay: '-3.9s' }} />
              <path className="edge edge--live" data-from="core" data-to="s3" d="M602 205 C602 150 644 108 644 70" style={{ animationDelay: '-4.9s' }} />
              <path className="edge edge--live" data-from="core" data-to="s4" d="M602 205 C602 150 728 118 744 70" style={{ animationDelay: '-5.9s' }} />
            </g>

            <g>
              <rect className="core-plate" x="452" y="150" width="300" height="320" rx="16" />
              <rect className="core-hatch" x="452" y="150" width="300" height="320" rx="16" />
              <rect className="core-pulse" x="452" y="150" width="300" height="320" rx="16" />
              <text className="n-core" x="602" y="174" textAnchor="middle">
                AgiMate
              </text>

              <g className="plate" data-plate="channel" data-tip="channel">
                <rect className="shape" x="482" y="186" width="240" height="38" rx="8" />
                <rect className="verdict" x="482" y="186" width="240" height="38" rx="8" />
                <text className="n-plate" x="602" y="209" textAnchor="middle">
                  {t('channel')}
                </text>
              </g>
              <g className="key" data-key>
                <circle className="ring" cx="602" cy="250" r="15" />
                <g className="glyph">
                  <circle cx="596" cy="250" r="5.2" />
                  <path d="M601 250 H612" />
                  <path d="M608 250 V255" />
                  <path d="M612 250 V254" />
                </g>
              </g>
              <text className="n-note key-note" data-keynote x="602" y="440" textAnchor="middle">
                {t('keynote')}
              </text>
              <g className="plate" data-plate="rules" data-tip="rules">
                <rect className="shape" x="482" y="276" width="240" height="42" rx="8" />
                <rect className="verdict" x="482" y="276" width="240" height="42" rx="8" />
                <text className="n-plate" x="602" y="301" textAnchor="middle">
                  {t('rules')}
                </text>
              </g>
              <g className="plate" data-plate="router">
                <rect className="shape" x="482" y="332" width="240" height="42" rx="8" />
                <rect className="verdict" x="482" y="332" width="240" height="42" rx="8" />
                <text className="n-plate" x="602" y="357" textAnchor="middle">
                  {t('routing')}
                </text>
              </g>
            </g>

            {toolChip('c1', 176)}
            {triggerChip('c2', 208)}
            {triggerChip('c3', 250)}
            {toolChip('c7', 282)}
            {triggerChip('c4', 336)}
            {toolChip('c5', 368)}
            {triggerChip('c6', 412)}
            {toolChip('c8', 444)}

            <g className="node" data-node="n1" data-tip="n1">
              <rect className="shape" x="200" y="184" width="132" height="42" rx="21" />
              <rect className="glow" x="200" y="184" width="132" height="42" rx="21" />
              <text className="n-label" x="266" y="209" textAnchor="middle">
                {NODE_NAME.n1}
              </text>
            </g>
            <g className="node" data-node="n2" data-tip="n2">
              <rect className="shape" x="200" y="258" width="132" height="42" rx="10" />
              <rect className="glow" x="200" y="258" width="132" height="42" rx="10" />
              <text className="n-label" x="266" y="283" textAnchor="middle">
                {NODE_NAME.n2}
              </text>
            </g>
            <g className="node" data-node="n3" data-tip="n3">
              <rect className="shape" x="200" y="344" width="132" height="42" rx="21" />
              <rect className="glow" x="200" y="344" width="132" height="42" rx="21" />
              <text className="n-label" x="266" y="369" textAnchor="middle">
                {NODE_NAME.n3}
              </text>
            </g>
            <g className="node" data-node="n4" data-tip="n4">
              <rect className="shape" x="200" y="420" width="132" height="42" rx="10" />
              <rect className="glow" x="200" y="420" width="132" height="42" rx="10" />
              <text className="n-label" x="266" y="445" textAnchor="middle">
                {NODE_NAME.n4}
              </text>
            </g>

            {screenNode('s1', 406, t('webchat'))}
            {screenNode('s2', 506, t('telegram'))}
            {screenNode('s3', 606, t('whatsapp'))}
            {screenNode('s4', 706, t('slack'))}

            {hexAgent('a1', 992, 82)}
            {hexAgent('a2', 1052, 177)}
            {hexAgent('a3', 1084, 272)}
            {hexAgent('a4', 1084, 368)}
            {hexAgent('a5', 1052, 463)}
            {hexAgent('a6', 992, 558)}

            {flight('α')}
            {flight('β')}
            {flight('γ')}
          </g>
        </svg>

        <p className="hiw__stagecap" data-stagecap aria-hidden="true"></p>

        <div className="hiw__logs" aria-hidden="true">
          <div className="hiw__log" data-log="trigger">
            <p className="hiw__logcap">{t('logTrigger')}</p>
            <div className="hiw__row" data-age="0"></div>
            <div className="hiw__row" data-age="1"></div>
            <div className="hiw__row" data-age="2"></div>
          </div>
          <div className="hiw__log" data-log="tool">
            <p className="hiw__logcap">{t('logTool')}</p>
            <div className="hiw__row" data-age="0"></div>
            <div className="hiw__row" data-age="1"></div>
            <div className="hiw__row" data-age="2"></div>
          </div>
        </div>

        <div className="hiw__tip" role="presentation"></div>
      </div>

      <div className="hiw__foot">
        <button className="hiw__btn" type="button" data-pause>
          {t('pause')}
        </button>
        <button className="hiw__btn hiw__btn--narrow" type="button" data-whole>
          {t('whole')}
        </button>
        <span>{t('hint')}</span>
      </div>
    </section>
  );
}
