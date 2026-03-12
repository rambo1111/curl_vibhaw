// ============================================================
// VIBHAW ASCII Animation — Cloudflare Worker
// Deploy: wrangler deploy
// Run:    curl https://YOUR_SUBDOMAIN.workers.dev
// ============================================================

// --- CONFIGURATION ---
const FRAME_DELAY_MS   = 100;
const TERMINAL_WIDTH   = 80;
const TERMINAL_HEIGHT  = 24;
const BACKGROUND_MODE  = 'matrix';   // 'matrix' | 'starfield'
const ENABLE_GLITCH          = true;
const GLITCH_PROBABILITY     = 0.05;
const ENABLE_PULSING         = true;
const ENABLE_PARTICLES       = true;
const ENABLE_TRAILS          = true;
const PARTICLE_COUNT         = 30;
const TRAIL_LENGTH           = 15;
const RAIN_DENSITY           = 70;
const MAX_FRAMES             = 2000; // safety cap — closes stream after ~3.3 min

// --- COLOR & STYLE CONSTANTS ---
const PALETTE = [
    196, 202, 208, 214, 220, 226, 190, 154, 118, 82, 46, 47, 48, 49, 50, 51,
    45, 39, 33, 27, 21, 20, 26, 32, 38, 44, 50, 49, 48, 47, 46, 82, 118, 154,
    190, 226, 220, 214, 208, 202, 196, 197, 198, 199, 200, 201, 207, 213, 219,
    225, 224, 223, 222, 221, 215, 209, 203, 197, 160, 161, 162, 168, 174, 180,
    186, 192, 193, 194, 195,
].map(c => `\x1b[38;5;${c}m`);

const RESET          = '\x1b[0m';
const MATRIX_HEAD    = '\x1b[38;5;155m';
const MATRIX_TRAIL   = '\x1b[38;5;22m';
const INFO_COLOR     = '\x1b[38;5;246m';
const STAR_COLOR     = '\x1b[38;5;252m';
const PARTICLE_COLORS = [40, 41, 42, 43, 44, 45, 34, 35, 36];

// --- ASCII ART FRAMES ---
const RAW_FRAMES = [
`
VVVVVVVV           VVVVVVVV
V::::::V           V::::::V
V::::::V           V::::::V
V::::::V           V::::::V
 V:::::V           V:::::V
  V:::::V         V:::::V
   V:::::V       V:::::V
    V:::::V     V:::::V
     V:::::V   V:::::V
      V:::::V V:::::V
       V:::::V:::::V
        V:::::::::V
         V:::::::V
          V:::::V
           V:::V
            VVV
`,
`
IIIIIIIIII
I::::::::I
I::::::::I
II::::::II
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
II::::::II
I::::::::I
I::::::::I
IIIIIIIIII
`,
`
BBBBBBBBBBBBBBBBB
B::::::::::::::::B
B::::::BBBBBB:::::B
BB:::::B     B:::::B
  B::::B     B:::::B
  B::::B     B:::::B
  B::::BBBBBB:::::B
  B:::::::::::::BB
  B::::BBBBBB:::::B
  B::::B     B:::::B
  B::::B     B:::::B
  B::::B     B:::::B
BB:::::BBBBBB::::::B
B:::::::::::::::::B
B::::::::::::::::B
BBBBBBBBBBBBBBBBB
`,
`
HHHHHHHHH     HHHHHHHHH
H:::::::H     H:::::::H
H:::::::H     H:::::::H
HH::::::H     H::::::HH
  H:::::H     H:::::H
  H:::::H     H:::::H
  H::::::HHHHH::::::H
  H:::::::::::::::::H
  H:::::::::::::::::H
  H::::::HHHHH::::::H
  H:::::H     H:::::H
  H:::::H     H:::::H
HH::::::H     H::::::HH
H:::::::H     H:::::::H
H:::::::H     H:::::::H
HHHHHHHHH     HHHHHHHHH
`,
`
A
A:A
A:::A
A:::::A
A:::::::A
A:::::::::A
A:::::A:::::A
A:::::A A:::::A
A:::::A   A:::::A
A:::::A     A:::::A
A:::::AAAAAAAAA:::::A
A:::::::::::::::::::::A
A:::::AAAAAAAAAAAAA:::::A
A:::::A             A:::::A
A:::::A               A:::::A
A:::::A                 A:::::A
AAAAAAA                   AAAAAAA
`,
`
WWWWWWWW                           WWWWWWWW
W::::::W                           W::::::W
W::::::W                           W::::::W
W::::::W                           W::::::W
 W:::::W           WWWWW           W:::::W
  W:::::W         W:::::W         W:::::W
   W:::::W       W:::::::W       W:::::W
    W:::::W     W:::::::::W     W:::::W
     W:::::W   W:::::W:::::W   W:::::W
      W:::::W W:::::W W:::::W W:::::W
       W:::::W:::::W   W:::::W:::::W
        W:::::::::W     W:::::::::W
         W:::::::W       W:::::::W
          W:::::W         W:::::W
           W:::W           W:::W
            WWW             WWW
`,
`
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
 ░▒▓█▓▒▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
 ░▒▓█▓▒▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▓█▓▒░ ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▓█▓▒░ ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
   ░▒▓██▓▒░  ░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█████████████▓▒░
`,
];

const FRAMES = RAW_FRAMES.map(frame => {
    const lines = frame.trim().split('\n');
    const width  = Math.max(...lines.map(l => l.length));
    return { lines, width, height: lines.length };
});

const BOOT_SEQUENCE = [
    'Connection established...',
    'VIBHAW BIOS v2.5a',
    'Initializing terminal...',
    'Memory check: 65536 KB OK',
    'Loading animation modules...',
    '  - Particle engine... OK',
    '  - Trail renderer... OK',
    '  - Background... OK',
    'Starting render loop.',
    '',
];

// --- RENDER HELPERS ---

/** Move cursor to (col, row) and write colored text. */
function at(row, col, color, text) {
    return `\x1b[${row};${col}H${color}${text}`;
}

function renderGlitchedArt(art, x, y, color) {
    const isGlitching = ENABLE_GLITCH && Math.random() < GLITCH_PROBABILITY;
    let out = '';
    for (let i = 0; i < art.lines.length; i++) {
        let line = art.lines[i];
        if (isGlitching && Math.random() < 0.5 && line.trim().length > 0) {
            const chars = line.split('');
            chars[Math.floor(Math.random() * chars.length)] = ['#', '*', '%', '$'][Math.floor(Math.random() * 4)];
            line = chars.join('');
        }
        out += at(y + i, x, color, line);
    }
    return out;
}

function renderRainbowArt(art, x, y, frameCount) {
    let out = '';
    for (let i = 0; i < art.lines.length; i++) {
        let row = `\x1b[${y + i};${x}H`;
        for (let j = 0; j < art.lines[i].length; j++) {
            row += `${PALETTE[(x + j + frameCount) % PALETTE.length]}${art.lines[i][j]}`;
        }
        out += row;
    }
    return out;
}

function renderInfoBar() {
    const info = `[ ${new Date().toUTCString()} ]`;
    return at(1, TERMINAL_WIDTH - info.length, INFO_COLOR, info);
}

function renderMatrixRain(raindrops) {
    let out = '';
    for (const drop of raindrops) {
        const trailY = drop.y - 1;
        if (trailY > 0) out += at(trailY, drop.x, MATRIX_TRAIL, drop.char);
        out += at(drop.y, drop.x, MATRIX_HEAD, drop.char);
        drop.y++;
        if (drop.y > TERMINAL_HEIGHT) {
            drop.y = 1;
            drop.x = Math.floor(Math.random() * TERMINAL_WIDTH) + 1;
        }
    }
    return out;
}

function renderStarfield(stars, frameCount) {
    let out = '';
    for (const star of stars) {
        if (Math.sin(frameCount / star.twinkleSpeed) > 0.6) {
            out += at(star.y, star.x, STAR_COLOR, star.char);
        }
    }
    return out;
}

/** Advances particles and returns their render string. Mutates the array. */
function tickParticles(particles) {
    let out = '';
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        out += at(Math.round(p.y), Math.round(p.x), `\x1b[38;5;${p.color}m`, p.char);
        p.x += p.dx;
        p.y += p.dy;
        p.lifespan--;
        if (p.lifespan <= 0) particles.splice(i, 1);
    }
    return out;
}

/** Advances trails and returns their render string. Mutates the array. */
function tickTrails(trails) {
    let out = '';
    for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        const fadeColor = `\x1b[38;5;${22 + trail.lifespan}m`;
        for (let j = 0; j < trail.art.lines.length; j++) {
            out += at(trail.y + j, trail.x, fadeColor, trail.art.lines[j]);
        }
        trail.lifespan--;
        if (trail.lifespan <= 0) trails.splice(i, 1);
    }
    return out;
}

function spawnParticles(cx, cy) {
    const batch = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        batch.push({
            x: cx, y: cy,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed * 0.5,
            char: '*',
            color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            lifespan: 10 + Math.random() * 10,
        });
    }
    return batch;
}

// --- FRAME RENDERER ---
// Builds one complete frame string from current state (pure function except
// for the mutable arrays: raindrops, particles, trails).
function renderFrame(state) {
    let frame = '\x1b[2J\x1b[H'; // clear + home

    // Background
    frame += BACKGROUND_MODE === 'matrix'
        ? renderMatrixRain(state.raindrops)
        : renderStarfield(state.stars, state.frameCount);

    frame += renderInfoBar();

    // Effects
    if (ENABLE_TRAILS)    frame += tickTrails(state.trails);
    if (ENABLE_PARTICLES) frame += tickParticles(state.particles);

    // State machine
    const art   = FRAMES[state.frameIndex];
    let color   = PALETTE[state.colorIndex];

    switch (state.mode) {
        case 'booting': {
            const linesToShow = Math.floor(state.modeCounter / 5);
            for (let i = 0; i < linesToShow && i < BOOT_SEQUENCE.length; i++) {
                frame += at(i + 2, 4, INFO_COLOR, BOOT_SEQUENCE[i]);
            }
            if (linesToShow >= BOOT_SEQUENCE.length) {
                state.mode = 'spelling';
                state.modeCounter = 0;
            } else {
                state.modeCounter++;
            }
            break;
        }

        case 'spelling': {
            const cx = Math.floor((TERMINAL_WIDTH  - art.width)  / 2);
            const cy = Math.floor((TERMINAL_HEIGHT - art.height) / 2);
            if (ENABLE_PULSING) {
                const pulse = Math.sin(state.frameCount / 10) * 5;
                color = PALETTE[(state.colorIndex + Math.floor(pulse) + PALETTE.length) % PALETTE.length];
            }
            frame += renderGlitchedArt(art, cx, cy, color);
            state.modeCounter++;
            if (state.modeCounter > 10) {
                state.modeCounter = 0;
                state.frameIndex++;
                if (state.frameIndex >= FRAMES.length - 1) {
                    state.mode = 'finale';
                }
            }
            break;
        }

        case 'finale': {
            const cx = Math.floor((TERMINAL_WIDTH  - art.width)  / 2);
            const cy = Math.floor((TERMINAL_HEIGHT - art.height) / 2);
            frame += renderRainbowArt(art, cx, cy, state.frameCount);
            state.modeCounter++;
            if (state.modeCounter > 40) {
                state.mode = 'bouncing';
                state.frameIndex = 0;
            }
            break;
        }

        case 'bouncing': {
            if (ENABLE_TRAILS && state.frameCount % 2 === 0) {
                state.trails.unshift({ x: state.pos.x, y: state.pos.y, art, lifespan: TRAIL_LENGTH });
                if (state.trails.length > TRAIL_LENGTH) state.trails.pop();
            }

            state.pos.x += state.vel.dx;
            state.pos.y += state.vel.dy;

            let bounced = false;
            let bounceX = state.pos.x + art.width  / 2;
            let bounceY = state.pos.y + art.height / 2;

            if (state.pos.x <= 1) {
                state.vel.dx *= -1; state.pos.x = 1; bounced = true;
            }
            if (state.pos.x + art.width >= TERMINAL_WIDTH) {
                state.vel.dx *= -1; state.pos.x = TERMINAL_WIDTH - art.width; bounced = true;
            }
            if (state.pos.y <= 1) {
                state.vel.dy *= -1; state.pos.y = 1; bounced = true;
            }
            if (state.pos.y + art.height >= TERMINAL_HEIGHT) {
                state.vel.dy *= -1; state.pos.y = TERMINAL_HEIGHT - art.height; bounced = true;
            }

            if (bounced) {
                state.colorIndex = (state.colorIndex + 10) % PALETTE.length;
                state.frameIndex = (state.frameIndex + 1) % (FRAMES.length - 1);
                bounceX = state.pos.x + art.width  / 2;
                bounceY = state.pos.y + art.height / 2;
                if (ENABLE_PARTICLES) {
                    state.particles.push(...spawnParticles(bounceX, bounceY));
                }
            }

            frame += renderGlitchedArt(art, state.pos.x, state.pos.y, PALETTE[state.colorIndex]);
            break;
        }
    }

    frame += RESET;
    state.colorIndex  = (state.colorIndex + 1) % PALETTE.length;
    state.frameCount++;
    return frame;
}

// --- INITIAL STATE FACTORY ---
function createState() {
    return {
        mode: 'booting',
        modeCounter: 0,
        frameCount: 0,
        frameIndex: 0,
        colorIndex: 0,
        pos: { x: 5, y: 5 },
        vel: { dx: 1, dy: 1 },
        raindrops: Array.from({ length: RAIN_DENSITY }, () => ({
            x:    Math.floor(Math.random() * TERMINAL_WIDTH) + 1,
            y:    Math.floor(Math.random() * TERMINAL_HEIGHT) + 1,
            char: String.fromCharCode(0x30A0 + Math.random() * 96),
        })),
        stars: Array.from({ length: 100 }, () => ({
            x:            Math.floor(Math.random() * TERMINAL_WIDTH) + 1,
            y:            Math.floor(Math.random() * TERMINAL_HEIGHT) + 1,
            char:         ['.', '*'][Math.floor(Math.random() * 2)],
            twinkleSpeed: 10 + Math.random() * 40,
        })),
        particles: [],
        trails: [],
    };
}

// --- CLOUDFLARE WORKER ENTRY POINT ---
export default {
    async fetch(request) {
        const url = new URL(request.url);

        // Health / cron ping endpoint
        if (url.pathname === '/cron') {
            return new Response('cron acknowledged\n', {
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        const userAgent = request.headers.get('user-agent') || '';
        const isCurl    = userAgent.toLowerCase().includes('curl');

        // Non-curl clients → redirect to GitHub
        if (!isCurl) {
            return Response.redirect('https://github.com/rambo1111/curl_vibhaw', 302);
        }

        // curl client → stream the animation
        const encoder = new TextEncoder();
        const state   = createState();

        const stream = new ReadableStream({
            start(controller) {
                // Send ANSI hide-cursor on connect
                controller.enqueue(encoder.encode('\x1b[?25l'));

                const timer = setInterval(() => {
                    try {
                        const chunk = renderFrame(state);
                        controller.enqueue(encoder.encode(chunk));

                        // Safety cap: close after MAX_FRAMES
                        if (state.frameCount >= MAX_FRAMES) {
                            clearInterval(timer);
                            // Restore cursor before closing
                            controller.enqueue(encoder.encode('\x1b[?25h\x1b[2J\x1b[H'));
                            controller.close();
                        }
                    } catch {
                        clearInterval(timer);
                        controller.close();
                    }
                }, FRAME_DELAY_MS);

                // If the client disconnects, clean up the interval
                request.signal.addEventListener('abort', () => {
                    clearInterval(timer);
                    // Don't error — client just closed the connection
                });
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type':  'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-store',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    },
};// ============================================================
// VIBHAW ASCII Animation — Cloudflare Worker
// Deploy: wrangler deploy
// Run:    curl https://YOUR_SUBDOMAIN.workers.dev
// ============================================================

// --- CONFIGURATION ---
const FRAME_DELAY_MS   = 100;
const TERMINAL_WIDTH   = 80;
const TERMINAL_HEIGHT  = 24;
const BACKGROUND_MODE  = 'matrix';   // 'matrix' | 'starfield'
const ENABLE_GLITCH          = true;
const GLITCH_PROBABILITY     = 0.05;
const ENABLE_PULSING         = true;
const ENABLE_PARTICLES       = true;
const ENABLE_TRAILS          = true;
const PARTICLE_COUNT         = 30;
const TRAIL_LENGTH           = 15;
const RAIN_DENSITY           = 70;
const MAX_FRAMES             = 2000; // safety cap — closes stream after ~3.3 min

// --- COLOR & STYLE CONSTANTS ---
const PALETTE = [
    196, 202, 208, 214, 220, 226, 190, 154, 118, 82, 46, 47, 48, 49, 50, 51,
    45, 39, 33, 27, 21, 20, 26, 32, 38, 44, 50, 49, 48, 47, 46, 82, 118, 154,
    190, 226, 220, 214, 208, 202, 196, 197, 198, 199, 200, 201, 207, 213, 219,
    225, 224, 223, 222, 221, 215, 209, 203, 197, 160, 161, 162, 168, 174, 180,
    186, 192, 193, 194, 195,
].map(c => `\x1b[38;5;${c}m`);

const RESET          = '\x1b[0m';
const MATRIX_HEAD    = '\x1b[38;5;155m';
const MATRIX_TRAIL   = '\x1b[38;5;22m';
const INFO_COLOR     = '\x1b[38;5;246m';
const STAR_COLOR     = '\x1b[38;5;252m';
const PARTICLE_COLORS = [40, 41, 42, 43, 44, 45, 34, 35, 36];

// --- ASCII ART FRAMES ---
const RAW_FRAMES = [
`
VVVVVVVV           VVVVVVVV
V::::::V           V::::::V
V::::::V           V::::::V
V::::::V           V::::::V
 V:::::V           V:::::V
  V:::::V         V:::::V
   V:::::V       V:::::V
    V:::::V     V:::::V
     V:::::V   V:::::V
      V:::::V V:::::V
       V:::::V:::::V
        V:::::::::V
         V:::::::V
          V:::::V
           V:::V
            VVV
`,
`
IIIIIIIIII
I::::::::I
I::::::::I
II::::::II
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
  I::::I
II::::::II
I::::::::I
I::::::::I
IIIIIIIIII
`,
`
BBBBBBBBBBBBBBBBB
B::::::::::::::::B
B::::::BBBBBB:::::B
BB:::::B     B:::::B
  B::::B     B:::::B
  B::::B     B:::::B
  B::::BBBBBB:::::B
  B:::::::::::::BB
  B::::BBBBBB:::::B
  B::::B     B:::::B
  B::::B     B:::::B
  B::::B     B:::::B
BB:::::BBBBBB::::::B
B:::::::::::::::::B
B::::::::::::::::B
BBBBBBBBBBBBBBBBB
`,
`
HHHHHHHHH     HHHHHHHHH
H:::::::H     H:::::::H
H:::::::H     H:::::::H
HH::::::H     H::::::HH
  H:::::H     H:::::H
  H:::::H     H:::::H
  H::::::HHHHH::::::H
  H:::::::::::::::::H
  H:::::::::::::::::H
  H::::::HHHHH::::::H
  H:::::H     H:::::H
  H:::::H     H:::::H
HH::::::H     H::::::HH
H:::::::H     H:::::::H
H:::::::H     H:::::::H
HHHHHHHHH     HHHHHHHHH
`,
`
A
A:A
A:::A
A:::::A
A:::::::A
A:::::::::A
A:::::A:::::A
A:::::A A:::::A
A:::::A   A:::::A
A:::::A     A:::::A
A:::::AAAAAAAAA:::::A
A:::::::::::::::::::::A
A:::::AAAAAAAAAAAAA:::::A
A:::::A             A:::::A
A:::::A               A:::::A
A:::::A                 A:::::A
AAAAAAA                   AAAAAAA
`,
`
WWWWWWWW                           WWWWWWWW
W::::::W                           W::::::W
W::::::W                           W::::::W
W::::::W                           W::::::W
 W:::::W           WWWWW           W:::::W
  W:::::W         W:::::W         W:::::W
   W:::::W       W:::::::W       W:::::W
    W:::::W     W:::::::::W     W:::::W
     W:::::W   W:::::W:::::W   W:::::W
      W:::::W W:::::W W:::::W W:::::W
       W:::::W:::::W   W:::::W:::::W
        W:::::::::W     W:::::::::W
         W:::::::W       W:::::::W
          W:::::W         W:::::W
           W:::W           W:::W
            WWW             WWW
`,
`
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
 ░▒▓█▓▒▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
 ░▒▓█▓▒▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▓█▓▒░ ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▓█▓▒░ ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
   ░▒▓██▓▒░  ░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█████████████▓▒░
`,
];

const FRAMES = RAW_FRAMES.map(frame => {
    const lines = frame.trim().split('\n');
    const width  = Math.max(...lines.map(l => l.length));
    return { lines, width, height: lines.length };
});

const BOOT_SEQUENCE = [
    'Connection established...',
    'VIBHAW BIOS v2.5a',
    'Initializing terminal...',
    'Memory check: 65536 KB OK',
    'Loading animation modules...',
    '  - Particle engine... OK',
    '  - Trail renderer... OK',
    '  - Background... OK',
    'Starting render loop.',
    '',
];

// --- RENDER HELPERS ---

/** Move cursor to (col, row) and write colored text. */
function at(row, col, color, text) {
    return `\x1b[${row};${col}H${color}${text}`;
}

function renderGlitchedArt(art, x, y, color) {
    const isGlitching = ENABLE_GLITCH && Math.random() < GLITCH_PROBABILITY;
    let out = '';
    for (let i = 0; i < art.lines.length; i++) {
        let line = art.lines[i];
        if (isGlitching && Math.random() < 0.5 && line.trim().length > 0) {
            const chars = line.split('');
            chars[Math.floor(Math.random() * chars.length)] = ['#', '*', '%', '$'][Math.floor(Math.random() * 4)];
            line = chars.join('');
        }
        out += at(y + i, x, color, line);
    }
    return out;
}

function renderRainbowArt(art, x, y, frameCount) {
    let out = '';
    for (let i = 0; i < art.lines.length; i++) {
        let row = `\x1b[${y + i};${x}H`;
        for (let j = 0; j < art.lines[i].length; j++) {
            row += `${PALETTE[(x + j + frameCount) % PALETTE.length]}${art.lines[i][j]}`;
        }
        out += row;
    }
    return out;
}

function renderInfoBar() {
    const info = `[ ${new Date().toUTCString()} ]`;
    return at(1, TERMINAL_WIDTH - info.length, INFO_COLOR, info);
}

function renderMatrixRain(raindrops) {
    let out = '';
    for (const drop of raindrops) {
        const trailY = drop.y - 1;
        if (trailY > 0) out += at(trailY, drop.x, MATRIX_TRAIL, drop.char);
        out += at(drop.y, drop.x, MATRIX_HEAD, drop.char);
        drop.y++;
        if (drop.y > TERMINAL_HEIGHT) {
            drop.y = 1;
            drop.x = Math.floor(Math.random() * TERMINAL_WIDTH) + 1;
        }
    }
    return out;
}

function renderStarfield(stars, frameCount) {
    let out = '';
    for (const star of stars) {
        if (Math.sin(frameCount / star.twinkleSpeed) > 0.6) {
            out += at(star.y, star.x, STAR_COLOR, star.char);
        }
    }
    return out;
}

/** Advances particles and returns their render string. Mutates the array. */
function tickParticles(particles) {
    let out = '';
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        out += at(Math.round(p.y), Math.round(p.x), `\x1b[38;5;${p.color}m`, p.char);
        p.x += p.dx;
        p.y += p.dy;
        p.lifespan--;
        if (p.lifespan <= 0) particles.splice(i, 1);
    }
    return out;
}

/** Advances trails and returns their render string. Mutates the array. */
function tickTrails(trails) {
    let out = '';
    for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        const fadeColor = `\x1b[38;5;${22 + trail.lifespan}m`;
        for (let j = 0; j < trail.art.lines.length; j++) {
            out += at(trail.y + j, trail.x, fadeColor, trail.art.lines[j]);
        }
        trail.lifespan--;
        if (trail.lifespan <= 0) trails.splice(i, 1);
    }
    return out;
}

function spawnParticles(cx, cy) {
    const batch = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        batch.push({
            x: cx, y: cy,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed * 0.5,
            char: '*',
            color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            lifespan: 10 + Math.random() * 10,
        });
    }
    return batch;
}

// --- FRAME RENDERER ---
// Builds one complete frame string from current state (pure function except
// for the mutable arrays: raindrops, particles, trails).
function renderFrame(state) {
    let frame = '\x1b[2J\x1b[H'; // clear + home

    // Background
    frame += BACKGROUND_MODE === 'matrix'
        ? renderMatrixRain(state.raindrops)
        : renderStarfield(state.stars, state.frameCount);

    frame += renderInfoBar();

    // Effects
    if (ENABLE_TRAILS)    frame += tickTrails(state.trails);
    if (ENABLE_PARTICLES) frame += tickParticles(state.particles);

    // State machine
    const art   = FRAMES[state.frameIndex];
    let color   = PALETTE[state.colorIndex];

    switch (state.mode) {
        case 'booting': {
            const linesToShow = Math.floor(state.modeCounter / 5);
            for (let i = 0; i < linesToShow && i < BOOT_SEQUENCE.length; i++) {
                frame += at(i + 2, 4, INFO_COLOR, BOOT_SEQUENCE[i]);
            }
            if (linesToShow >= BOOT_SEQUENCE.length) {
                state.mode = 'spelling';
                state.modeCounter = 0;
            } else {
                state.modeCounter++;
            }
            break;
        }

        case 'spelling': {
            const cx = Math.floor((TERMINAL_WIDTH  - art.width)  / 2);
            const cy = Math.floor((TERMINAL_HEIGHT - art.height) / 2);
            if (ENABLE_PULSING) {
                const pulse = Math.sin(state.frameCount / 10) * 5;
                color = PALETTE[(state.colorIndex + Math.floor(pulse) + PALETTE.length) % PALETTE.length];
            }
            frame += renderGlitchedArt(art, cx, cy, color);
            state.modeCounter++;
            if (state.modeCounter > 10) {
                state.modeCounter = 0;
                state.frameIndex++;
                if (state.frameIndex >= FRAMES.length - 1) {
                    state.mode = 'finale';
                }
            }
            break;
        }

        case 'finale': {
            const cx = Math.floor((TERMINAL_WIDTH  - art.width)  / 2);
            const cy = Math.floor((TERMINAL_HEIGHT - art.height) / 2);
            frame += renderRainbowArt(art, cx, cy, state.frameCount);
            state.modeCounter++;
            if (state.modeCounter > 40) {
                state.mode = 'bouncing';
                state.frameIndex = 0;
            }
            break;
        }

        case 'bouncing': {
            if (ENABLE_TRAILS && state.frameCount % 2 === 0) {
                state.trails.unshift({ x: state.pos.x, y: state.pos.y, art, lifespan: TRAIL_LENGTH });
                if (state.trails.length > TRAIL_LENGTH) state.trails.pop();
            }

            state.pos.x += state.vel.dx;
            state.pos.y += state.vel.dy;

            let bounced = false;
            let bounceX = state.pos.x + art.width  / 2;
            let bounceY = state.pos.y + art.height / 2;

            if (state.pos.x <= 1) {
                state.vel.dx *= -1; state.pos.x = 1; bounced = true;
            }
            if (state.pos.x + art.width >= TERMINAL_WIDTH) {
                state.vel.dx *= -1; state.pos.x = TERMINAL_WIDTH - art.width; bounced = true;
            }
            if (state.pos.y <= 1) {
                state.vel.dy *= -1; state.pos.y = 1; bounced = true;
            }
            if (state.pos.y + art.height >= TERMINAL_HEIGHT) {
                state.vel.dy *= -1; state.pos.y = TERMINAL_HEIGHT - art.height; bounced = true;
            }

            if (bounced) {
                state.colorIndex = (state.colorIndex + 10) % PALETTE.length;
                state.frameIndex = (state.frameIndex + 1) % (FRAMES.length - 1);
                bounceX = state.pos.x + art.width  / 2;
                bounceY = state.pos.y + art.height / 2;
                if (ENABLE_PARTICLES) {
                    state.particles.push(...spawnParticles(bounceX, bounceY));
                }
            }

            frame += renderGlitchedArt(art, state.pos.x, state.pos.y, PALETTE[state.colorIndex]);
            break;
        }
    }

    frame += RESET;
    state.colorIndex  = (state.colorIndex + 1) % PALETTE.length;
    state.frameCount++;
    return frame;
}

// --- INITIAL STATE FACTORY ---
function createState() {
    return {
        mode: 'booting',
        modeCounter: 0,
        frameCount: 0,
        frameIndex: 0,
        colorIndex: 0,
        pos: { x: 5, y: 5 },
        vel: { dx: 1, dy: 1 },
        raindrops: Array.from({ length: RAIN_DENSITY }, () => ({
            x:    Math.floor(Math.random() * TERMINAL_WIDTH) + 1,
            y:    Math.floor(Math.random() * TERMINAL_HEIGHT) + 1,
            char: String.fromCharCode(0x30A0 + Math.random() * 96),
        })),
        stars: Array.from({ length: 100 }, () => ({
            x:            Math.floor(Math.random() * TERMINAL_WIDTH) + 1,
            y:            Math.floor(Math.random() * TERMINAL_HEIGHT) + 1,
            char:         ['.', '*'][Math.floor(Math.random() * 2)],
            twinkleSpeed: 10 + Math.random() * 40,
        })),
        particles: [],
        trails: [],
    };
}

// --- CLOUDFLARE WORKER ENTRY POINT ---
export default {
    async fetch(request) {
        const url = new URL(request.url);

        // Health / cron ping endpoint
        if (url.pathname === '/cron') {
            return new Response('cron acknowledged\n', {
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        const userAgent = request.headers.get('user-agent') || '';
        const isCurl    = userAgent.toLowerCase().includes('curl');

        // Non-curl clients → redirect to GitHub
        if (!isCurl) {
            return Response.redirect('https://github.com/rambo1111/curl_vibhaw', 302);
        }

        // curl client → stream the animation
        const encoder = new TextEncoder();
        const state   = createState();

        const stream = new ReadableStream({
            start(controller) {
                // Send ANSI hide-cursor on connect
                controller.enqueue(encoder.encode('\x1b[?25l'));

                const timer = setInterval(() => {
                    try {
                        const chunk = renderFrame(state);
                        controller.enqueue(encoder.encode(chunk));

                        // Safety cap: close after MAX_FRAMES
                        if (state.frameCount >= MAX_FRAMES) {
                            clearInterval(timer);
                            // Restore cursor before closing
                            controller.enqueue(encoder.encode('\x1b[?25h\x1b[2J\x1b[H'));
                            controller.close();
                        }
                    } catch {
                        clearInterval(timer);
                        controller.close();
                    }
                }, FRAME_DELAY_MS);

                // If the client disconnects, clean up the interval
                request.signal.addEventListener('abort', () => {
                    clearInterval(timer);
                    // Don't error — client just closed the connection
                });
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type':  'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-store',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    },
};
