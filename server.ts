import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientSession {
  id: string;
  ws: WebSocket;
  name: string;
  elo: number;
  roomId: string | null;
}

interface MatchRoom {
  id: string;
  name: string;
  mode: 'casual' | 'ranked' | 'custom' | 'tournament';
  scale: string;
  timeControl: 'blitz' | 'rapid' | 'classical' | 'correspondence_2d';
  senteId: string | null;
  senteName: string;
  goteId: string | null;
  goteName: string;
  turn: 'sente' | 'gote';
  senteMs: number;
  goteMs: number;
  incrementMs: number;
  lastTickTs: number;
  status: 'waiting' | 'playing' | 'finished';
  tournamentId?: string;
  matchSlotId?: string;
}

interface TournamentParticipant {
  id: string;
  name: string;
  elo: number;
  isBot: boolean;
  botId?: string;
}

interface BracketMatch {
  slotId: string;
  round: number;
  p1: TournamentParticipant | null;
  p2: TournamentParticipant | null;
  winner: TournamentParticipant | null;
  status: 'pending' | 'active' | 'done';
  roomId?: string;
}

interface TournamentState {
  id: string;
  title: string;
  size: 4 | 8;
  scale: string;
  timeControl: 'blitz' | 'rapid' | 'classical' | 'correspondence_2d';
  status: 'registering' | 'in_progress' | 'completed';
  participants: TournamentParticipant[];
  matches: BracketMatch[];
  champion: TournamentParticipant | null;
}

const TIME_CONTROLS = {
  blitz: { initialMs: 3 * 60 * 1000, incrementMs: 2000 },
  rapid: { initialMs: 10 * 60 * 1000, incrementMs: 5000 },
  classical: { initialMs: 30 * 60 * 1000, incrementMs: 10000 },
  correspondence_2d: { initialMs: 48 * 3600 * 1000, incrementMs: 5000 },
};

const clients = new Map<string, ClientSession>();
const rooms = new Map<string, MatchRoom>();
const queue: { clientId: string; mode: 'casual' | 'ranked'; scale: string; timeControl: 'blitz' | 'rapid' | 'classical' | 'correspondence_2d' }[] = [];

const TOURNAMENT_BOT_POOL: TournamentParticipant[] = [
  { id: 'bot-19', name: 'Ryūō Sōta (AI)', elo: 2580, isBot: true, botId: 'bot-19' },
  { id: 'bot-17', name: 'Honinbō Sansa (AI)', elo: 2400, isBot: true, botId: 'bot-17' },
  { id: 'bot-15', name: 'Princess Kagu-ya (AI)', elo: 2210, isBot: true, botId: 'bot-15' },
  { id: 'bot-13', name: 'Master Shingen (AI)', elo: 2040, isBot: true, botId: 'bot-13' },
  { id: 'bot-11', name: 'Hanzō of the Tengu (AI)', elo: 1850, isBot: true, botId: 'bot-11' },
  { id: 'bot-09', name: 'Lady Tomoe (AI)', elo: 1620, isBot: true, botId: 'bot-09' },
  { id: 'bot-08', name: 'Raiden the Lion Tamer (AI)', elo: 1500, isBot: true, botId: 'bot-08' },
];

function createInitialTournaments(): Record<string, TournamentState> {
  return {
    'sng-4': {
      id: 'sng-4',
      title: '4-Player Imperial Sit & Go',
      size: 4,
      scale: 'shogi9',
      timeControl: 'blitz',
      status: 'registering',
      participants: [],
      matches: [
        { slotId: 'sf-1', round: 1, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'sf-2', round: 1, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'final', round: 2, p1: null, p2: null, winner: null, status: 'pending' },
      ],
      champion: null,
    },
    'sched-8': {
      id: 'sched-8',
      title: '8-Player Meijin Grand Prix',
      size: 8,
      scale: 'chu12',
      timeControl: 'rapid',
      status: 'registering',
      participants: [],
      matches: [
        { slotId: 'qf-1', round: 1, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'qf-2', round: 1, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'qf-3', round: 1, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'qf-4', round: 1, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'sf-1', round: 2, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'sf-2', round: 2, p1: null, p2: null, winner: null, status: 'pending' },
        { slotId: 'final', round: 3, p1: null, p2: null, winner: null, status: 'pending' },
      ],
      champion: null,
    },
  };
}

const tournaments: Record<string, TournamentState> = createInitialTournaments();

function sendTo(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastLobbyState() {
  const openRooms = Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    mode: r.mode,
    scale: r.scale,
    timeControl: r.timeControl,
    senteName: r.senteName,
    goteName: r.goteName,
    status: r.status,
  }));

  const msg = JSON.stringify({
    type: 'lobby:update',
    onlineCount: clients.size,
    queueCount: queue.length,
    rooms: openRooms,
    tournaments: Object.values(tournaments),
    serverTs: Date.now(),
  });

  clients.forEach(c => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}

function broadcastRoomEvent(roomId: string, payload: unknown) {
  const room = rooms.get(roomId);
  if (!room) return;
  [room.senteId, room.goteId].forEach(cid => {
    if (!cid) return;
    const cl = clients.get(cid);
    if (cl) sendTo(cl.ws, payload);
  });
}

function startTournamentBracket(t: TournamentState) {
  t.status = 'in_progress';
  t.champion = null;
  if (t.size === 4) {
    t.matches[0].p1 = t.participants[0] || null;
    t.matches[0].p2 = t.participants[1] || null;
    t.matches[0].status = 'active';
    t.matches[1].p1 = t.participants[2] || null;
    t.matches[1].p2 = t.participants[3] || null;
    t.matches[1].status = 'active';
  } else {
    for (let i = 0; i < 4; i++) {
      t.matches[i].p1 = t.participants[i * 2] || null;
      t.matches[i].p2 = t.participants[i * 2 + 1] || null;
      t.matches[i].status = 'active';
    }
  }
  resolveBotVsBotMatches(t);
}

function resolveBotVsBotMatches(t: TournamentState) {
  let progressed = false;
  for (const m of t.matches) {
    if (m.status === 'active' && m.p1 && m.p2 && m.p1.isBot && m.p2.isBot) {
      // Higher ELO bot wins with slight upset chance
      const p1Chance = m.p1.elo / (m.p1.elo + m.p2.elo);
      m.winner = Math.random() < p1Chance + 0.1 ? m.p1 : m.p2;
      m.status = 'done';
      progressed = true;
    }
  }
  if (progressed) {
    advanceBracketWinners(t);
  }
}

function advanceBracketWinners(t: TournamentState) {
  if (t.size === 4) {
    const sf1 = t.matches[0];
    const sf2 = t.matches[1];
    const fin = t.matches[2];
    if (sf1.winner && !fin.p1) fin.p1 = sf1.winner;
    if (sf2.winner && !fin.p2) fin.p2 = sf2.winner;
    if (fin.p1 && fin.p2 && fin.status === 'pending') {
      fin.status = 'active';
      resolveBotVsBotMatches(t);
    }
    if (fin.winner) {
      t.champion = fin.winner;
      t.status = 'completed';
    }
  } else {
    // 8-player bracket: qf-1..4 (indices 0..3), sf-1..2 (indices 4..5), final (index 6)
    const [qf1, qf2, qf3, qf4, sf1, sf2, fin] = t.matches;
    if (qf1.winner && !sf1.p1) sf1.p1 = qf1.winner;
    if (qf2.winner && !sf1.p2) sf1.p2 = qf2.winner;
    if (sf1.p1 && sf1.p2 && sf1.status === 'pending') sf1.status = 'active';

    if (qf3.winner && !sf2.p1) sf2.p1 = qf3.winner;
    if (qf4.winner && !sf2.p2) sf2.p2 = qf4.winner;
    if (sf2.p1 && sf2.p2 && sf2.status === 'pending') sf2.status = 'active';

    resolveBotVsBotMatches(t);

    if (sf1.winner && !fin.p1) fin.p1 = sf1.winner;
    if (sf2.winner && !fin.p2) fin.p2 = sf2.winner;
    if (fin.p1 && fin.p2 && fin.status === 'pending') {
      fin.status = 'active';
      resolveBotVsBotMatches(t);
    }
    if (fin.winner) {
      t.champion = fin.winner;
      t.status = 'completed';
    }
  }
}

// Tick active room clocks every 1000ms
setInterval(() => {
  const now = Date.now();
  rooms.forEach(room => {
    if (room.status !== 'playing') return;
    const elapsed = now - room.lastTickTs;
    room.lastTickTs = now;
    if (room.turn === 'sente') {
      room.senteMs = Math.max(0, room.senteMs - elapsed);
      if (room.senteMs === 0) {
        room.status = 'finished';
        broadcastRoomEvent(room.id, {
          type: 'room:timeout',
          loser: 'sente',
          winner: 'gote',
          senteMs: 0,
          goteMs: room.goteMs,
        });
      }
    } else {
      room.goteMs = Math.max(0, room.goteMs - elapsed);
      if (room.goteMs === 0) {
        room.status = 'finished';
        broadcastRoomEvent(room.id, {
          type: 'room:timeout',
          loser: 'gote',
          winner: 'sente',
          senteMs: room.senteMs,
          goteMs: 0,
        });
      }
    }
  });
}, 1000);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json());

  // Instant healthcheck endpoint for dev server readiness probes
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, status: 'ready', port: 3000, ts: Date.now() });
  });

  // API endpoint for synchronized Multi-File .ZIP Project Exporter
  app.get('/api/project-files', (_req, res) => {
    const filePaths = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'metadata.json',
      'server.ts',
      'src/main.tsx',
      'src/index.css',
      'src/App.tsx',
      'src/engine/pieceRegistry.ts',
      'src/engine/shogiEngine.ts',
      'src/engine/aiMasters.ts',
      'src/engine/dojoAndAcademy.ts',
      'src/engine/strategyCurriculum.ts',
      'src/engine/sound.ts',
      'src/engine/canvasRenderer.ts',
      'src/engine/userTestSuite.ts',
      'src/agents/agentTeam.ts',
    ];
    const files: Record<string, string> = {};
    for (const rel of filePaths) {
      try {
        const abs = path.resolve(__dirname, rel);
        if (fs.existsSync(abs)) {
          files[rel] = fs.readFileSync(abs, 'utf-8');
        }
      } catch {
        // ignore missing
      }
    }
    res.json({ files });
  });

  // WebSocket Server on the same HTTP server (port 3000)
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', ws => {
    const clientId = 'p-' + Math.random().toString(36).slice(2, 9);
    const session: ClientSession = {
      id: clientId,
      ws,
      name: `Samurai-${clientId.slice(-4).toUpperCase()}`,
      elo: 1200,
      roomId: null,
    };
    clients.set(clientId, session);

    sendTo(ws, {
      type: 'welcome',
      clientId,
      name: session.name,
      serverTs: Date.now(),
    });
    broadcastLobbyState();

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'profile:update') {
          if (msg.name) session.name = String(msg.name).slice(0, 28);
          if (typeof msg.elo === 'number') session.elo = msg.elo;
          broadcastLobbyState();
        } else if (msg.type === 'queue:join') {
          const mode = msg.mode === 'ranked' ? 'ranked' : 'casual';
          const scale = msg.scale || 'shogi9';
          const timeControl = TIME_CONTROLS[msg.timeControl as keyof typeof TIME_CONTROLS] ? msg.timeControl : 'rapid';

          // Remove existing queue entry for this client
          const existingIdx = queue.findIndex(q => q.clientId === clientId);
          if (existingIdx !== -1) queue.splice(existingIdx, 1);

          // Look for compatible waiting player
          const matchIdx = queue.findIndex(
            q => q.clientId !== clientId && q.mode === mode && q.scale === scale && q.timeControl === timeControl
          );

          if (matchIdx !== -1) {
            const partnerEntry = queue.splice(matchIdx, 1)[0];
            const partner = clients.get(partnerEntry.clientId);
            if (partner && partner.ws.readyState === WebSocket.OPEN) {
              const roomId = 'match-' + Math.random().toString(36).slice(2, 8);
              const tc = TIME_CONTROLS[timeControl as keyof typeof TIME_CONTROLS];
              const room: MatchRoom = {
                id: roomId,
                name: `${mode.toUpperCase()} • ${ partner.name } vs ${ session.name }`,
                mode,
                scale,
                timeControl,
                senteId: partner.id,
                senteName: partner.name,
                goteId: session.id,
                goteName: session.name,
                turn: 'sente',
                senteMs: tc.initialMs,
                goteMs: tc.initialMs,
                incrementMs: tc.incrementMs,
                lastTickTs: Date.now(),
                status: 'playing',
              };
              rooms.set(roomId, room);
              partner.roomId = roomId;
              session.roomId = roomId;

              sendTo(partner.ws, { type: 'room:start', room, mySide: 'sente', serverTs: Date.now() });
              sendTo(session.ws, { type: 'room:start', room, mySide: 'gote', serverTs: Date.now() });
              broadcastLobbyState();
              return;
            }
          }

          queue.push({ clientId, mode, scale, timeControl });
          sendTo(ws, { type: 'queue:searching', mode, scale, timeControl });
          broadcastLobbyState();
        } else if (msg.type === 'queue:leave') {
          const idx = queue.findIndex(q => q.clientId === clientId);
          if (idx !== -1) queue.splice(idx, 1);
          broadcastLobbyState();
        } else if (msg.type === 'room:create') {
          const scale = msg.scale || 'taikyoku36';
          const timeControl = TIME_CONTROLS[msg.timeControl as keyof typeof TIME_CONTROLS] ? msg.timeControl : 'rapid';
          const tc = TIME_CONTROLS[timeControl as keyof typeof TIME_CONTROLS];
          const roomId = 'room-' + Math.floor(1000 + Math.random() * 9000);
          const room: MatchRoom = {
            id: roomId,
            name: msg.name || `${session.name}'s Match`,
            mode: 'custom',
            scale,
            timeControl,
            senteId: session.id,
            senteName: session.name,
            goteId: null,
            goteName: 'Waiting...',
            turn: 'sente',
            senteMs: tc.initialMs,
            goteMs: tc.initialMs,
            incrementMs: tc.incrementMs,
            lastTickTs: Date.now(),
            status: 'waiting',
          };
          rooms.set(roomId, room);
          session.roomId = roomId;
          sendTo(ws, { type: 'room:created', room, mySide: 'sente' });
          broadcastLobbyState();
        } else if (msg.type === 'room:join') {
          const room = rooms.get(msg.roomId);
          if (room && room.status === 'waiting' && room.senteId !== session.id) {
            room.goteId = session.id;
            room.goteName = session.name;
            room.status = 'playing';
            room.lastTickTs = Date.now();
            session.roomId = room.id;

            const host = room.senteId ? clients.get(room.senteId) : null;
            if (host) sendTo(host.ws, { type: 'room:start', room, mySide: 'sente', serverTs: Date.now() });
            sendTo(ws, { type: 'room:start', room, mySide: 'gote', serverTs: Date.now() });
            broadcastLobbyState();
          }
        } else if (msg.type === 'room:move') {
          const room = session.roomId ? rooms.get(session.roomId) : null;
          if (!room || room.status !== 'playing') return;

          const now = Date.now();
          const elapsed = now - room.lastTickTs;
          room.lastTickTs = now;

          // Update clock + Fischer increment if turn finished
          if (msg.finishTurn) {
            if (room.turn === 'sente') {
              room.senteMs = Math.max(0, room.senteMs - elapsed) + room.incrementMs;
              room.turn = 'gote';
            } else {
              room.goteMs = Math.max(0, room.goteMs - elapsed) + room.incrementMs;
              room.turn = 'sente';
            }
          }

          broadcastRoomEvent(room.id, {
            type: 'room:move',
            senderId: session.id,
            action: msg.action,
            turn: room.turn,
            senteMs: room.senteMs,
            goteMs: room.goteMs,
            serverTs: now,
          });
        } else if (msg.type === 'room:chat') {
          const room = session.roomId ? rooms.get(session.roomId) : null;
          if (!room) return;
          broadcastRoomEvent(room.id, {
            type: 'room:chat',
            sender: session.name,
            text: String(msg.text || '').slice(0, 200),
          });
        } else if (msg.type === 'tournament:join') {
          const t = tournaments[msg.tournamentId];
          if (!t || t.status !== 'registering') return;
          if (!t.participants.some(p => p.id === session.id) && t.participants.length < t.size) {
            t.participants.push({
              id: session.id,
              name: session.name,
              elo: session.elo,
              isBot: false,
            });
            if (t.participants.length === t.size) {
              startTournamentBracket(t);
            }
            broadcastLobbyState();
          }
        } else if (msg.type === 'tournament:fill_bots') {
          const t = tournaments[msg.tournamentId];
          if (!t) return;
          if (t.status === 'completed') {
            // Reset and re-seed
            const fresh = createInitialTournaments()[t.id];
            tournaments[t.id] = fresh;
          }
          const activeT = tournaments[msg.tournamentId];
          if (!activeT.participants.some(p => p.id === session.id)) {
            activeT.participants.push({
              id: session.id,
              name: session.name,
              elo: session.elo,
              isBot: false,
            });
          }
          let botIdx = 0;
          while (activeT.participants.length < activeT.size) {
            const botTemplate = TOURNAMENT_BOT_POOL[botIdx % TOURNAMENT_BOT_POOL.length];
            botIdx++;
            activeT.participants.push({
              ...botTemplate,
              id: `${botTemplate.id}-${botIdx}`,
            });
          }
          if (activeT.status === 'registering') {
            startTournamentBracket(activeT);
          }
          broadcastLobbyState();
        } else if (msg.type === 'tournament:report_win') {
          const t = tournaments[msg.tournamentId];
          if (!t) return;
          const match = t.matches.find(m => m.slotId === msg.slotId);
          if (match && match.status === 'active') {
            const winner = msg.winnerId === match.p1?.id ? match.p1 : match.p2;
            if (winner) {
              match.winner = winner;
              match.status = 'done';
              advanceBracketWinners(t);
              broadcastLobbyState();
            }
          }
        } else if (msg.type === 'tournament:reset') {
          const fresh = createInitialTournaments();
          if (fresh[msg.tournamentId]) {
            tournaments[msg.tournamentId] = fresh[msg.tournamentId];
            broadcastLobbyState();
          }
        }
      } catch {
        // ignore malformed JSON
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      const qIdx = queue.findIndex(q => q.clientId === clientId);
      if (qIdx !== -1) queue.splice(qIdx, 1);
      if (session.roomId) {
        const room = rooms.get(session.roomId);
        if (room && room.status === 'waiting') {
          rooms.delete(session.roomId);
        }
      }
      broadcastLobbyState();
    });
  });

  const PORT = 3000;
  // Bind port 3000 immediately so container & preview readiness probes succeed without waiting on Vite cold-start
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Taikyoku Shogi Suite Server & WebSocket Matchmaker listening on http://0.0.0.0:${PORT}`);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
