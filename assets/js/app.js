'use strict';

/* ============ Configuración ============ */
const PLATFORM = {
    speed: 230,        // px/s de avance
    gravity: 1900,
    jumpV: 680,
    bounceV: 480,
    blobSize: 34,
    walkerChance: 0.4, // probabilidad de que un mini camine hacia el héroe (el resto se queda quieto en el camino)
    walkerSpeed: 90,   // velocidad (px/s) de los minis que caminan
    attackMs: 500,     // duración del golpe
    attackReach: 120,  // alcance del golpe delante del héroe (px)
    minionSpeed: 230,  // velocidad de los enemigos invocados
    minionDamage: 10,
    streakForSummon: 3,
    answerAttackDelayMs: 1000, // pausa tras responder antes de reproducir las animaciones de ataque
    miniTimeBonus: 2,  // segundos que se ganan en el duelo al derrotar un mini
    winAnimMs: 900,    // duración de una repetición de player_vence (ajustar a la animación)
    winRepeats: 2,
    enterSpeed: 260, // velocidad (px/s) con que el héroe entra caminando al iniciar una etapa
    exitSpeed: 260,    // velocidad (px/s) con que el héroe sale de la pantalla al ganar
    hitDamage: 10,     // daño al chocar de lado con un círculo
    minHp: 10,         // en plataforma no se puede morir
    invulnMs: 1200,
    playerXRatio: 0.18,
    bossXRatio: 0.7
};

const STAGES = [
    {
        id: 'addition-basic', summon: { chance: 1, count: 2 }, type: 'classic', name: 'Pradera de las Sumas', theme: 'prairie',
        enemyName: 'Slime Sumón', enemyHp: 200, time: 10, damage: 25, track: 2200, blobs: 6,
        // Suelo exportado de Animate (escena 1080×500). walkY: altura (en px de la escena) donde pisan los personajes.
        // cycles: largo del recorrido medido en repeticiones del suelo (reemplaza a track). 3 = prueba del ciclo.
        ground: { src: 'assets/bg/e1_bg1.html', width: 1080, height: 500, walkY: 412 }, cycles: 3,
        range: { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
        winText: '¡Derrotaste al Slime Sumón!', nextOnWin: 'addition-up-to-50', nextOnLose: 'addition-basic'
    },
    {
        id: 'addition-up-to-50', summon: { chance: 0.6, count: 2 }, type: 'classic', name: 'Bosque del 50', theme: 'forest',
        enemyName: 'Guardián del Bosque', enemyHp: 100, time: 10, damage: 25, track: 2600, blobs: 8,
        range: { aMin: 5, aMax: 45, total: 50 },
        winText: '¡El bosque queda en paz!', nextOnWin: 'addition-up-to-100', nextOnLose: 'addition-up-to-50'
    },
    {
        id: 'addition-up-to-100', summon: { chance: 1, count: 3, random: 0.35 }, type: 'classic', name: 'Desierto del 100', theme: 'desert',
        enemyName: 'Escorpión Sumador', enemyHp: 100, time: 10, damage: 25, track: 3000, blobs: 10,
        range: { aMin: 10, aMax: 90, total: 100 },
        winText: '¡Cruzaste el desierto!', nextOnWin: 'addition-hundreds', nextOnLose: 'addition-up-to-100'
    },
    {
        id: 'addition-hundreds', summon: { chance: 1, count: 4, random: 0.45 }, type: 'classic', name: 'Montañas de los Cientos', theme: 'mountain',
        enemyName: 'Gigante de Roca', enemyHp: 100, time: 10, damage: 25, track: 3400, blobs: 12,
        range: { aMin: 100, aMax: 899, total: 999 },
        winText: '¡Escalaste las montañas!', nextOnWin: 'boss-puzzle', nextOnLose: 'addition-hundreds'
    },
    {
        id: 'boss-puzzle', summon: { chance: 1, count: 5, random: 0.55 }, type: 'puzzle', name: 'Castillo de los Jefes', theme: 'castle',
        bosses: [{ name: 'Mago Aritmético', hp: 120 }, { name: 'Rey Fórmula', hp: 150 }],
        enemyName: 'Jefe', time: 30, damage: 20, track: 3800, blobs: 14,
        winText: '¡Completaste Aventuras del Cálculo!', nextOnWin: null, nextOnLose: 'boss-puzzle'
    }
];

const PLAYER_ANIM = { stand: 'player_standBy', walk: 'player_camina', jump: 'player_salta', attack: 'player_ataca1', hurt: 'player_pierde', win: 'player_vence', lose: 'player_derrotado' };
const ENEMY_ANIM = { stand: 'enemy_1_standBy', attack: 'enemy_1_ataca1', summon: 'enemy1_invoca', hurt: 'enemy_1_pierde', hurt2: 'enemy_1_pierde2', die: 'enemy_1_muere' };

/* ============ Estado ============ */
const GAME = {
    stage: STAGES[0], mode: 'menu',  // menu | platform | boss-intro | combat | transition
    paused: false,
    playerHp: 100, enemyHp: 100, enemyMax: 100, bossIndex: 0,
    roundLocked: false, stageLocked: false,
    timeLeft: 0, timerId: null, timeouts: [],
    stomps: 0, hintDismissed: false,
    // plataforma
    camera: 0, y: 0, vy: 0, invulnUntil: 0, blobs: [], lastFrame: 0, rafId: 0, bossShown: false,
    answer: null, puzzle: null, keys: { left: false, right: false, crouch: false }, nextSpawn: 0, moving: false, attackStart: 0, attackUntil: 0, streak: 0, roundId: 0, minions: [], summoning: false, summon: null
};

const $ = (id) => document.getElementById(id);
const elements = {
    game: $('game'), stage: $('stage'), track: $('track'), player: $('player'), enemy: $('enemy'),
    layerCloud: $('layerCloud'), layerMid: $('layerMid'), layerGround: $('layerGround'),
    stageName: $('stageName'), stageProgress: $('stageProgress'), stompCount: $('stompCount'),
    timerBox: $('timerBox'), timerText: $('timerText'), timerFill: $('timerFill'),
    playerHp: $('playerHp'), enemyHp: $('enemyHp'), enemyCard: $('enemyCard'), enemyName: $('enemyName'),
    hint: $('platformHint'), platformInfo: $('platformInfo'),
    classicMode: $('classicMode'), puzzleMode: $('puzzleMode'),
    question: $('question'), answers: $('answers'), puzzleGoal: $('puzzleGoal'), puzzleOptions: $('puzzleOptions'),
    feedback: $('feedback'), pauseBtn: $('pauseBtn'),
    modal: $('endModal'), modalTitle: $('modalTitle'), modalText: $('modalText'),
    modalPrimary: $('modalPrimary'), modalSecondary: $('modalSecondary')
};

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
const stageById = (id) => STAGES.find(s => s.id === id);

/* ============ Utilidades de tiempo ============ */
function later(fn, ms) {
    const id = setTimeout(() => { GAME.timeouts = GAME.timeouts.filter(t => t !== id); if (!GAME.paused) fn(); else GAME.pending.push(fn); }, ms);
    GAME.timeouts.push(id);
    return id;
}
GAME.pending = [];
function clearTimers() {
    clearInterval(GAME.timerId); GAME.timerId = null;
    GAME.timeouts.forEach(clearTimeout); GAME.timeouts = []; GAME.pending = [];
}

/* ============ Animación de personajes (iframes de Adobe Animate) ============ */
function playAnim(frame, label) {
    let tries = 0;
    (function attempt() {
        try {
            const root = frame.contentWindow.exportRoot;
            if (root) { root.gotoAndPlay(label); return; }
        } catch (e) { /* iframe aún no listo o bloqueado por file:// */ }
        if (++tries < 40) setTimeout(attempt, 150);
    })();
}
const playerAnim = (k) => playAnim(elements.player, PLAYER_ANIM[k]);
const enemyAnim = (k) => playAnim(elements.enemy, ENEMY_ANIM[k]);
// Reacciones puntuales: tras reproducirse, el personaje vuelve a su pose base (no desaparece ni sigue a la animación siguiente).
let enemyBackId = null;
function enemyReact(k, ms) {
    enemyAnim(k);
    clearTimeout(enemyBackId);
    enemyBackId = setTimeout(() => { if (GAME.enemyHp > 0 || GAME.bossIndex < 0) enemyAnim('stand'); }, ms);
}

// Si la animación de caminar llega a otra etiqueta, la reenganchamos para que haga loop.
let walkWatch = null;
function keepWalking(on) {
    clearInterval(walkWatch);
    if (!on) return;
    walkWatch = setInterval(() => {
        try {
            if (performance.now() < GAME.attackUntil || GAME.y > 0) return;
            const f = elements.player.contentWindow.exportRoot.currentFrame;
            if (f < 65 || f >= 81) elements.player.contentWindow.exportRoot.gotoAndPlay(PLAYER_ANIM.walk);
        } catch (e) { /* sin acceso */ }
    }, 150);
}

/* ============ HUD ============ */
function updateHud() {
    elements.playerHp.style.width = Math.max(0, GAME.playerHp) + '%';
    elements.enemyHp.style.width = Math.max(0, GAME.enemyHp / GAME.enemyMax * 100) + '%';
    elements.stompCount.textContent = GAME.stomps;
    const idx = STAGES.indexOf(GAME.stage) + 1;
    elements.stageName.textContent = GAME.stage.name;
    elements.stageProgress.textContent = `Etapa ${idx} de ${STAGES.length}`;
}
function feedback(text, kind) {
    elements.feedback.textContent = text;
    elements.feedback.className = 'feedback' + (kind ? ' ' + kind : '');
}
function setMode(mode) {
    GAME.mode = mode;
    elements.game.dataset.mode = mode;
    const platform = mode === 'platform' || mode === 'boss-intro' || mode === 'enter';
    elements.platformInfo.hidden = !platform;
    elements.hint.hidden = mode !== 'platform' || GAME.hintDismissed;
    if (platform) { elements.classicMode.hidden = true; elements.puzzleMode.hidden = true; elements.timerBox.hidden = true; }
}
function playerScreenX() { return elements.stage.clientWidth * PLATFORM.playerXRatio; }

/* ============ Inicio de etapa: modo plataforma ============ */
function startStage(stage) {
    clearTimers(); cancelAnimationFrame(GAME.rafId); keepWalking(false);
    GAME.stage = stage;
    elements.game.dataset.stage = stage.theme;
    GAME.playerHp = 100; GAME.stomps = 0; GAME.bossIndex = 0;
    GAME.stageLocked = false; GAME.roundLocked = false; GAME.paused = false;
    elements.pauseBtn.textContent = '⏸';
    clearMinions(); GAME.summoning = false; GAME.streak = 0;
    GAME.camera = 0; GAME.y = 0; GAME.vy = 0; GAME.bossShown = false; GAME.invulnUntil = 0;
    elements.enemy.hidden = true; elements.enemyCard.hidden = true;
    elements.enemy.classList.remove('enter', 'hit');
    elements.player.classList.remove('blink');
    elements.player.style.transition = ''; elements.player.style.left = '';
    elements.player.style.setProperty('--jump', 0);
    feedback('');
    buildGround();
    buildTrack();
    setMode('enter');
    updateHud();
    GAME.moving = false;
    GAME.keys.left = GAME.keys.right = GAME.keys.crouch = false;
    elements.player.style.setProperty('--squat', 1);
    GAME.lastFrame = performance.now();
    GAME.rafId = requestAnimationFrame(platformLoop);
    walkIn();
}

// El héroe entra caminando desde el borde izquierdo hasta su posición; luego se habilitan los controles.
function walkIn() {
    const el = elements.player;
    const W = elements.stage.clientWidth;
    const targetX = W * PLATFORM.playerXRatio;
    const startX = -el.offsetWidth;
    el.style.transition = 'none';
    el.style.left = startX + 'px';
    void el.offsetWidth;
    const secs = (targetX - startX) / PLATFORM.enterSpeed;
    el.style.transition = `left ${secs}s linear`;
    el.style.left = targetX + 'px';
    playerAnim('walk'); keepWalking(true);
    later(() => {
        if (GAME.mode !== 'enter') return;
        el.style.transition = ''; el.style.left = '';
        keepWalking(false); playerAnim('stand');
        setMode('platform');
    }, secs * 1000);
}

/* ============ Suelo de Animate repetido en ciclo ============ */
// El suelo es una fila de iframes con la misma escena, escalada a la altura del escenario.
// La fila se desplaza camera % ancho, así que da la ilusión de un suelo infinito.
const FEET_RATIO = 3.5 / 160; // los pies del héroe quedan 3.5px sobre el borde inferior de su canvas de 160px
GAME.groundStep = 0;          // ancho (px enteros) de una repetición; 0 si la etapa usa el suelo CSS

function buildGround() {
    const layer = elements.layerGround, g = GAME.stage.ground;
    layer.style.transform = ''; layer.style.backgroundPositionX = '';
    if (!g) {
        layer.innerHTML = ''; delete layer.dataset.src; layer.classList.remove('tiled');
        GAME.groundStep = 0;
        elements.game.style.removeProperty('--ground-h'); elements.game.style.removeProperty('--feet');
        return;
    }
    if (layer.dataset.src !== g.src) { layer.innerHTML = ''; layer.dataset.src = g.src; } // misma escena: no recargar
    layer.classList.add('tiled');
    fitGround();
}

function fitGround() {
    const g = GAME.stage.ground, layer = elements.layerGround;
    const H = elements.stage.clientHeight, W = elements.stage.clientWidth;
    if (!g || !H || !layer.classList.contains('tiled')) return;
    const s = H / g.height;
    GAME.groundStep = Math.floor(g.width * s); // paso entero: evita costuras entre repeticiones
    const need = Math.ceil(W / GAME.groundStep) + 1;
    while (layer.children.length < need) {
        const f = document.createElement('iframe');
        f.className = 'ground-tile'; f.src = g.src; f.title = ''; f.tabIndex = -1;
        f.setAttribute('aria-hidden', 'true'); f.setAttribute('scrolling', 'no');
        layer.appendChild(f);
    }
    [...layer.children].forEach((f, i) => {
        f.style.left = i * GAME.groundStep + 'px';
        f.style.width = Math.ceil(g.width * s) + 'px';
        f.style.height = H + 'px';
    });
    elements.game.style.setProperty('--ground-h', (g.height - g.walkY) * s + 'px');
    elements.game.style.setProperty('--feet', `calc(var(--char) * ${FEET_RATIO})`);
}

// Largo total del recorrido: en ciclos de suelo si la etapa los define, si no en px (track).
function trackLength(W) {
    const s = GAME.stage;
    return s.cycles && GAME.groundStep ? s.cycles * GAME.groundStep + W * PLATFORM.bossXRatio : s.track;
}

function buildTrack() {
    elements.track.innerHTML = '';
    GAME.blobs = [];
    GAME.nextSpawn = rand(250, 500);
}

// Los minis (círculos rojos) aparecen de a poco, al azar, justo delante del jugador mientras avanza.
function spawnBlob(W) {
    const el = document.createElement('div');
    const walker = Math.random() < PLATFORM.walkerChance;
    el.className = 'blob pop' + (walker ? ' walker' : '');
    elements.track.appendChild(el);
    GAME.blobs.push({ x: GAME.camera + W + rand(10, 160), el, alive: true, walker });
}

// Modos en que el héroe puede saltar/golpear y los minis lo pueden dañar
const FIGHT_MODES = ['platform', 'boss-intro', 'combat'];

function jump() {
    if (!FIGHT_MODES.includes(GAME.mode) || GAME.paused || GAME.y > 0) return;
    GAME.vy = PLATFORM.jumpV;
    playerAnim('jump');
}

function dismissHint() {
    GAME.hintDismissed = true;
    elements.hint.hidden = true;
}

function attack() {
    const now = performance.now();
    const canFight = GAME.mode === 'platform' || (FIGHT_MODES.includes(GAME.mode) && (GAME.minions.length > 0 || GAME.blobs.some(b => b.alive)));
    if (!canFight || GAME.paused || now < GAME.attackUntil) return;
    GAME.attackStart = now; GAME.attackUntil = now + PLATFORM.attackMs;
    playerAnim('attack');
    later(() => {
        if (GAME.mode === 'platform') playerAnim(GAME.moving ? 'walk' : 'stand');
        else if (GAME.mode === 'combat' || GAME.mode === 'boss-intro') playerAnim('stand');
    }, PLATFORM.attackMs);
}

function platformLoop(now) {
    GAME.rafId = requestAnimationFrame(platformLoop);
    if (GAME.paused || GAME.mode === 'transition') { GAME.lastFrame = now; return; }
    const dt = Math.min(0.05, (now - GAME.lastFrame) / 1000);
    GAME.lastFrame = now;
    const W = elements.stage.clientWidth;
    const scale = parseFloat(getComputedStyle(elements.game).getPropertyValue('--char')) / 160 || 1;

    // Avance de cámara (se detiene al llegar al jefe)
    const track = trackLength(W);
    const stopAt = track - W * PLATFORM.bossXRatio;
    if (GAME.mode === 'platform') {
        const dir = (GAME.keys.right ? 1 : 0) - (GAME.keys.left ? 1 : 0);
        const prev = GAME.camera;
        GAME.camera = Math.max(0, Math.min(stopAt, GAME.camera + dir * PLATFORM.speed * dt * (GAME.keys.crouch ? 0.5 : 1)));
        const moving = GAME.camera !== prev;
        if (moving !== GAME.moving) {
            GAME.moving = moving; keepWalking(moving);
            if (GAME.y === 0 && performance.now() >= GAME.attackUntil) playerAnim(moving ? 'walk' : 'stand');
        }
        if (GAME.camera >= GAME.nextSpawn && GAME.camera < track - 1000) {
            spawnBlob(W);
            GAME.nextSpawn = GAME.camera + rand(300, 650);
        }
    }
    elements.player.style.setProperty('--squat', GAME.keys.crouch && GAME.y === 0 && GAME.mode === 'platform' ? 0.7 : 1);

    // Salto
    if (GAME.y > 0 || GAME.vy > 0) {
        GAME.vy -= PLATFORM.gravity * dt;
        GAME.y += GAME.vy * dt;
        if (GAME.y <= 0) {
            GAME.y = 0; GAME.vy = 0;
            // Aterrizaje: volver a caminar o reposo (salvo que esté golpeando)
            if (performance.now() >= GAME.attackUntil) {
                if (GAME.mode === 'platform') playerAnim(GAME.moving ? 'walk' : 'stand');
                else if (GAME.mode === 'combat' || GAME.mode === 'boss-intro') playerAnim('stand');
            }
        }
    }
    elements.player.style.setProperty('--jump', GAME.y);

    if (GAME.mode === 'combat' && GAME.minions.length) updateMinions(dt, W, scale);

    // Parallax
    elements.layerCloud.style.backgroundPositionX = (-GAME.camera * 0.2) + 'px';
    elements.layerMid.style.backgroundPositionX = (-GAME.camera * 0.5) + 'px';
    if (GAME.groundStep) elements.layerGround.style.transform = `translateX(${-(GAME.camera % GAME.groundStep)}px)`;
    else elements.layerGround.style.backgroundPositionX = (-GAME.camera) + 'px';

    // Círculos enemigos
    const px = W * PLATFORM.playerXRatio + (160 * scale) / 2;
    const half = 20 * scale, bs = PLATFORM.blobSize;
    const now2 = performance.now();
    for (const b of GAME.blobs) {
        if (b.walker && b.alive) b.x -= PLATFORM.walkerSpeed * dt;
        const sx = b.x - GAME.camera;
        b.el.style.left = sx + 'px';
        if (sx < -80) { b.el.remove(); b.dead = true; continue; }
        if (!b.alive || !FIGHT_MODES.includes(GAME.mode)) continue;
        if (now2 > GAME.attackStart + 100 && now2 < GAME.attackUntil && sx > px - half && sx < px + PLATFORM.attackReach * scale && GAME.y <= bs) {
            b.alive = false; b.el.classList.add('squashed');
            miniDefeated();
            continue;
        }
        const overlapX = px + half > sx + 4 && px - half < sx + bs - 4;
        if (!overlapX || GAME.y > bs) continue;
        if (GAME.vy < 0 && GAME.y > bs * 0.35) {
            b.alive = false; b.el.classList.add('squashed');
            GAME.vy = PLATFORM.bounceV; playerAnim('jump'); miniDefeated();
        } else if (now2 > GAME.invulnUntil) {
            GAME.invulnUntil = now2 + PLATFORM.invulnMs;
            // En plataforma no se puede morir; ya con el jefe presente, sí.
            const inPlatform = GAME.mode === 'platform';
            GAME.playerHp = inPlatform ? Math.max(PLATFORM.minHp, GAME.playerHp - PLATFORM.hitDamage) : GAME.playerHp - PLATFORM.hitDamage;
            updateHud(); playerAnim('hurt');
            if (GAME.playerHp <= 0) { loseStage(); break; }
            elements.player.classList.add('blink');
            later(() => { elements.player.classList.remove('blink'); if (GAME.mode === 'platform') playerAnim(GAME.moving ? 'walk' : 'stand'); else if (GAME.mode === 'combat' || GAME.mode === 'boss-intro') playerAnim('stand'); }, PLATFORM.invulnMs);
        }
    }

    GAME.blobs = GAME.blobs.filter(b => !b.dead);

    // Llegada al jefe
    if (GAME.mode === 'platform' && GAME.camera >= stopAt && GAME.y === 0) enterBossIntro();
}

function enterBossIntro() {
    setMode('boss-intro');
    keepWalking(false);
    playerAnim('stand');
    const boss = GAME.stage.type === 'puzzle' ? GAME.stage.bosses[0] : { name: GAME.stage.enemyName, hp: GAME.stage.enemyHp };
    spawnBoss(boss, 0);
    feedback(`¡Aparece ${boss.name}!`, 'bad');
    later(startCombat, 1200);
}

function spawnBoss(boss, index) {
    GAME.bossIndex = index;
    GAME.enemyMax = boss.hp; GAME.enemyHp = boss.hp;
    elements.enemyName.textContent = boss.name;
    elements.enemy.hidden = false; elements.enemyCard.hidden = false;
    elements.enemy.classList.remove('enter'); void elements.enemy.offsetWidth; elements.enemy.classList.add('enter');
    enemyAnim('stand');
    updateHud();
}

/* ============ Combate: matemáticas ============ */
function startCombat() {
    setMode('combat');
    const puzzle = GAME.stage.type === 'puzzle';
    elements.classicMode.hidden = puzzle;
    elements.puzzleMode.hidden = !puzzle;
    elements.timerBox.hidden = false;
    feedback('¡Responde antes de que se acabe el tiempo!');
    newRound();
}

function generateOperands(stage) {
    const r = stage.range;
    if (!r.total) return [rand(r.aMin, r.aMax), rand(r.bMin, r.bMax)];
    const a = rand(r.aMin, r.aMax);
    const bMin = stage.id === 'addition-hundreds' ? 100 : 1;
    return [a, rand(bMin, Math.max(bMin, r.total - a))];
}

function newRound() {
    GAME.roundLocked = false;
    const id = ++GAME.roundId;
    // Desde la etapa 3 el jefe puede invocar en cualquier momento de la ronda, y varias veces por batalla.
    const chance = GAME.stage.summon.random;
    if (chance && Math.random() < chance) {
        const delay = rand(1000, Math.max(1500, GAME.stage.time * 1000 - 3000));
        later(() => { if (GAME.roundId === id && !GAME.roundLocked && GAME.mode === 'combat') startSummon(); }, delay);
    }
    if (GAME.stage.type === 'puzzle') prepareFormulaRound(); else prepareClassicRound();
    startTimer();
}

function prepareClassicRound() {
    const [a, b] = generateOperands(GAME.stage);
    const sum = a + b;
    const wrong = new Set();
    const step = sum > 100 ? 10 : 1;
    while (wrong.size < 2) {
        const d = [-2, -1, 1, 2, 10, -10][rand(0, 5)] * (Math.random() < .3 ? step : 1);
        const c = sum + d;
        if (c > 0 && c !== sum) wrong.add(c);
    }
    GAME.answer = sum;
    elements.question.textContent = `${a} + ${b} = ?`;
    renderOptions(elements.answers, shuffle([sum, ...wrong]).map(v => ({ label: String(v), ok: v === sum })));
}

function evalExpr(a, op, b) { return op === '+' ? a + b : op === '-' ? a - b : a * b; }
function makeExpr(target) {
    const op = ['+', '-', '×'][rand(0, 2)];
    let a, b;
    if (op === '+') { a = rand(1, target - 1); b = target - a; }
    else if (op === '-') { b = rand(1, 12); a = target + b; }
    else {
        const divs = []; for (let d = 2; d < target; d++) if (target % d === 0) divs.push(d);
        if (!divs.length) return makeExpr(target);
        a = divs[rand(0, divs.length - 1)]; b = target / a;
    }
    return { text: `${a} ${op} ${b}`, value: target };
}
function makeDistractor(target) {
    const op = ['+', '-', '×'][rand(0, 2)];
    const a = rand(2, 15), b = rand(2, 12);
    const v = evalExpr(a, op, b);
    return v === target || v <= 0 ? makeDistractor(target) : { text: `${a} ${op} ${b}`, value: v };
}

function prepareFormulaRound() {
    const target = rand(8, 48);
    const valid = makeExpr(target);
    const options = [valid];
    while (options.length < 4) {
        const c = makeDistractor(target);
        if (!options.some(o => o.text === c.text)) options.push(c);
    }
    GAME.answer = target;
    elements.puzzleGoal.textContent = `Elige la operación que da ${target}`;
    renderOptions(elements.puzzleOptions, shuffle(options).map(o => ({ label: o.text, ok: o.value === target })));
}

function renderOptions(container, opts) {
    container.innerHTML = '';
    opts.forEach(o => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.textContent = o.label; btn.dataset.ok = o.ok ? '1' : '0';
        btn.addEventListener('click', () => verifyAnswer(btn, o.ok));
        container.appendChild(btn);
    });
}

/* ============ Tiempo de ronda ============ */
function startTimer() {
    clearInterval(GAME.timerId);
    GAME.timeLeft = GAME.stage.time;
    renderTimer();
    GAME.timerId = setInterval(() => {
        if (GAME.paused || GAME.roundLocked) return;
        GAME.timeLeft = Math.max(0, GAME.timeLeft - 0.1);
        renderTimer();
        if (GAME.timeLeft <= 0) { clearInterval(GAME.timerId); GAME.timerId = null; verifyAnswer(null, false, true); }
    }, 100);
}
// Derrotar un mini durante el duelo no daña al jefe: solo regala tiempo en la ronda en curso.
function miniDefeated() {
    GAME.stomps++; elements.stompCount.textContent = GAME.stomps;
    if (GAME.mode === 'combat' && !GAME.roundLocked && GAME.timerId) {
        GAME.timeLeft += PLATFORM.miniTimeBonus;
        renderTimer();
        feedback(`¡Mini derrotado! +${PLATFORM.miniTimeBonus} s`, 'good');
    }
}

function renderTimer() {
    elements.timerText.textContent = Math.ceil(GAME.timeLeft);
    const pct = Math.min(100, GAME.timeLeft / GAME.stage.time * 100);
    elements.timerFill.style.width = pct + '%';
    elements.timerFill.classList.toggle('low', pct < 30);
}

/* ============ Combate: resolución ============ */
function verifyAnswer(btn, correct, timeout) {
    if (GAME.roundLocked || GAME.stageLocked || GAME.paused || GAME.mode !== 'combat') return;
    GAME.roundLocked = true;
    clearInterval(GAME.timerId); GAME.timerId = null;
    const container = GAME.stage.type === 'puzzle' ? elements.puzzleOptions : elements.answers;
    container.querySelectorAll('button').forEach(b => {
        b.disabled = true;
        if (b.dataset.ok === '1') b.classList.add('ok');
    });
    if (btn && !correct) btn.classList.add('bad');

    if (correct) {
        GAME.streak++;
        feedback('¡Correcto! Atacas al enemigo.', 'good');
        later(() => { playerAnim('attack'); later(() => applyDamage('enemy'), 500); }, PLATFORM.answerAttackDelayMs);
    } else {
        GAME.streak = 0;
        feedback(timeout ? '¡Se acabó el tiempo! El enemigo ataca.' : 'Incorrecto. El enemigo ataca.', 'bad');
        later(() => { enemyReact('attack', 700); later(() => applyDamage('player'), 500); }, PLATFORM.answerAttackDelayMs);
    }
}

function applyDamage(target) {
    const dmg = GAME.stage.damage;
    if (target === 'enemy') {
        GAME.enemyHp -= dmg;
        enemyReact('hurt', 800);
        elements.enemy.classList.remove('enter'); elements.enemy.classList.add('hit'); later(() => elements.enemy.classList.remove('hit'), 300);
    } else {
        GAME.playerHp -= dmg;
        playerAnim('hurt');
    }
    updateHud();
    later(afterRound, 900);
}

function afterRound() {
    if (GAME.stageLocked) return;
    if (GAME.playerHp <= 0) return loseStage();
    if (GAME.enemyHp <= 0) return enemyDefeated();
    playerAnim('stand');
    if (GAME.streak >= PLATFORM.streakForSummon) {
        GAME.streak = 0;
        if (Math.random() < GAME.stage.summon.chance) startSummon();
    }
    newRound();
}

/* ============ Ataque extra: el jefe invoca enemigos ============ */
function clearMinions() {
    GAME.minions.forEach(m => m.el.remove());
    GAME.minions = [];
}

function startSummon() {
    if (GAME.minions.length || GAME.stageLocked) return;
    const count = GAME.stage.summon.count;
    feedback('¡El jefe invoca minis! Responde o golpéalos con Ctrl.', 'bad');
    enemyReact('summon', 2200);
    later(() => {
        const W = elements.stage.clientWidth;
        const x0 = W * 0.9 - 40;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'blob minion pop';
            elements.track.appendChild(el);
            GAME.minions.push({ el, x: x0 + i * 70 });   // llegan escalonados
        }
    }, 1000);
}

function updateMinions(dt, W, scale) {
    const px = W * PLATFORM.playerXRatio + (160 * scale) / 2;
    const half = 20 * scale;
    const now = performance.now();
    const bs = PLATFORM.blobSize;
    const striking = now > GAME.attackStart + 100 && now < GAME.attackUntil;
    for (const m of GAME.minions) {
        m.x -= PLATFORM.minionSpeed * dt;
        m.el.style.left = m.x + 'px';
        const overlapX = px + half > m.x + 4 && px - half < m.x + bs - 4;
        if (striking && m.x > px - half && m.x < px + PLATFORM.attackReach * scale) {
            m.done = true; m.el.classList.add('squashed');
            miniDefeated();
            setTimeout(() => m.el.remove(), 500);
        } else if (overlapX && GAME.y <= bs && GAME.vy < 0 && GAME.y > bs * 0.35) {
            // Salto sobre el mini invocado: se aplasta y el héroe rebota
            m.done = true; m.el.classList.add('squashed');
            GAME.vy = PLATFORM.bounceV; playerAnim('jump');
            miniDefeated();
            setTimeout(() => m.el.remove(), 500);
        } else if (m.x < -80) {
            m.done = true; m.el.remove();   // pasó por encima del héroe y salió de la pantalla
        } else if (overlapX && m.x + bs / 2 <= px + half && GAME.y <= bs) {
            m.done = true; m.el.remove();
            GAME.playerHp -= PLATFORM.minionDamage;
            updateHud(); playerAnim('hurt');
            if (GAME.playerHp <= 0) { loseStage(); break; }
            later(() => { if (GAME.playerHp > 0 && GAME.mode === 'combat') playerAnim('stand'); }, 600);
        }
    }
    GAME.minions = GAME.minions.filter(m => !m.done);
}

function enemyDefeated() {
    enemyAnim('die');
    const s = GAME.stage;
    if (s.type === 'puzzle' && GAME.bossIndex < s.bosses.length - 1) {
        feedback(`¡${s.bosses[GAME.bossIndex].name} derrotado! Viene otro jefe...`, 'good');
        GAME.roundLocked = true;
        later(() => { spawnBoss(s.bosses[GAME.bossIndex + 1], GAME.bossIndex + 1); later(() => { playerAnim('stand'); newRound(); }, 1200); }, 1500);
        return;
    }
    winStage();
}

/* ============ Fin de etapa ============ */
function winStage() {
    if (GAME.stageLocked) return;
    clearMinions(); GAME.summoning = false; clearInterval(GAME.timerId); GAME.timerId = null;
    GAME.stageLocked = true; GAME.roundLocked = true;
    setMode('transition');
    feedback('¡Victoria!', 'good');
    const s = GAME.stage, next = s.nextOnWin && stageById(s.nextOnWin);
    // player_vence se repite, luego el héroe camina hacia la derecha hasta salir de la pantalla
    for (let i = 0; i < PLATFORM.winRepeats; i++) later(() => playerAnim('win'), i * PLATFORM.winAnimMs);
    later(() => {
        playerAnim('walk'); keepWalking(true);
        walkOffScreen();
        showModal({
            title: next ? 'Etapa completada' : '¡Ganaste el juego!',
            text: `${s.winText} Derrotaste ${GAME.stomps} minis en el camino.` + (next ? ` Siguiente: ${next.name}.` : ''),
            primary: next ? 'Continuar' : 'Jugar de nuevo',
            onPrimary: () => startStage(next || STAGES[0]),
            secondary: next ? 'Reiniciar juego' : null,
            drop: true
        });
    }, PLATFORM.winRepeats * PLATFORM.winAnimMs);
}

function walkOffScreen() {
    const el = elements.player;
    const W = elements.stage.clientWidth;
    const startX = W * PLATFORM.playerXRatio;
    const target = W + 20;
    el.style.transition = 'none';
    el.style.left = startX + 'px';
    void el.offsetWidth;
    el.style.transition = `left ${(target - startX) / PLATFORM.exitSpeed}s linear`;
    el.style.left = target + 'px';
}

function loseStage() {
    if (GAME.stageLocked) return;
    clearMinions(); GAME.summoning = false; clearInterval(GAME.timerId); GAME.timerId = null;
    GAME.stageLocked = true; GAME.roundLocked = true;
    setMode('transition');
    playerAnim('lose');
    feedback('Has sido derrotado...', 'bad');
    later(() => showModal({
        title: 'Derrota', text: 'Practica un poco más e inténtalo otra vez.',
        primary: 'Repetir etapa', onPrimary: () => startStage(stageById(GAME.stage.nextOnLose)), secondary: 'Reiniciar juego'
    }), 1800);
}

function showModal({ title, text, primary, onPrimary, secondary, drop }) {
    elements.modal.classList.toggle('drop', !!drop);
    elements.modalTitle.textContent = title;
    elements.modalText.textContent = text;
    elements.modalPrimary.textContent = primary;
    elements.modalPrimary.onclick = () => { hideModal(); onPrimary(); };
    elements.modalSecondary.hidden = !secondary;
    elements.modalSecondary.onclick = () => { hideModal(); startStage(STAGES[0]); };
    elements.modal.classList.add('open');
    elements.modalPrimary.focus();
}
function hideModal() { elements.modal.classList.remove('open'); }

/* ============ Pausa ============ */
function togglePause() {
    if (!['platform', 'combat', 'boss-intro'].includes(GAME.mode)) return;
    GAME.paused = !GAME.paused;
    elements.pauseBtn.textContent = GAME.paused ? '▶' : '⏸';
    elements.pauseBtn.setAttribute('aria-label', GAME.paused ? 'Reanudar' : 'Pausar');
    feedback(GAME.paused ? 'Juego en pausa' : '');
    if (!GAME.paused) {
        GAME.lastFrame = performance.now();
        const p = GAME.pending; GAME.pending = []; p.forEach(fn => fn());
    }
}

/* ============ Entrada y arranque ============ */
function syncViewportMetrics() {
    const root = document.documentElement.style;
    root.setProperty('--app-width', window.innerWidth + 'px');
    root.setProperty('--app-height', window.innerHeight + 'px');
}
window.addEventListener('resize', syncViewportMetrics);
syncViewportMetrics();
// El alto del escenario cambia con la ventana y con el panel inferior: reescalar el suelo.
new ResizeObserver(fitGround).observe(elements.stage);
buildGround();

const KEYMAP = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyS: 'crouch', ArrowDown: 'crouch' };
document.addEventListener('keydown', (e) => {
    if (GAME.mode === 'platform' && !GAME.paused && (KEYMAP[e.code] || ['Space', 'KeyW', 'ArrowUp', 'ControlLeft', 'ControlRight'].includes(e.code))) dismissHint();
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (FIGHT_MODES.includes(GAME.mode)) { e.preventDefault(); jump(); }
    } else if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) {
        e.preventDefault(); attack();
    } else if (KEYMAP[e.code]) {
        if (GAME.mode === 'platform') { e.preventDefault(); GAME.keys[KEYMAP[e.code]] = true; }
    } else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});
document.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) GAME.keys[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { GAME.keys.left = GAME.keys.right = GAME.keys.crouch = false; });

/* ============ Controles táctiles (móvil) ============ */
// Se detecta si el dispositivo es táctil o de pantalla pequeña para mostrar los botones y la instrucción adecuada.
const TOUCH_QUERY = window.matchMedia('(pointer: coarse), (hover: none), (max-width: 900px)');
function syncInputMode() {
    const touch = TOUCH_QUERY.matches || navigator.maxTouchPoints > 0;
    elements.game.dataset.input = touch ? 'touch' : 'keys';
}
TOUCH_QUERY.addEventListener('change', syncInputMode);
window.addEventListener('resize', syncInputMode);
syncInputMode();

document.querySelectorAll('#touchControls .touch-btn').forEach((btn) => {
    const key = btn.dataset.key;
    const release = () => { btn.classList.remove('pressed'); if (key) GAME.keys[key] = false; };
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        btn.setPointerCapture?.(e.pointerId);
        btn.classList.add('pressed');
        if (GAME.mode === 'platform' && !GAME.paused) dismissHint();
        if (key) { if (GAME.mode === 'platform') GAME.keys[key] = true; }
        else if (btn.dataset.action === 'jump') jump();
        else if (btn.dataset.action === 'attack') attack();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, release));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
});

elements.stage.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (GAME.mode === 'platform') dismissHint(); if (GAME.mode === 'combat') attack(); else jump(); });
elements.pauseBtn.addEventListener('click', togglePause);
// La entrada del jefe se reproduce una sola vez; si no, al quitar la clase 'hit' volvería a entrar.
elements.enemy.addEventListener('animationend', (e) => { if (e.animationName === 'bossIn') elements.enemy.classList.remove('enter'); });

showModal({
    title: 'Aventuras del Cálculo',
    text: 'Corre hacia la derecha y salta sobre los enemigos pequeños. Al llegar al jefe de cada etapa, ¡resuelve las operaciones para vencerlo!',
    primary: 'Comenzar', onPrimary: () => startStage(STAGES[0]), secondary: null
});
