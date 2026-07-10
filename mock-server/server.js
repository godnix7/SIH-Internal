import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: false });
await app.register(cors, { origin: true });
await app.register(fastifyStatic, { root: path.join(dirname, 'dashboard'), prefix: '/dashboard/' });
await app.register(fastifyStatic, {
  root: path.join(dirname, 'node_modules', 'leaflet', 'dist'),
  prefix: '/leaflet/',
  decorateReply: false,
});
const io = new Server(app.server, { cors: { origin: '*' } });

const events = new Map();
const incidents = new Map();
const operator = { name: 'SI Dorjee', unit: 'UK-12' };

function emitIncident(incident) {
  io.emit('incident:update', incident);
}
function packet() {
  return { operator, incidents: [...incidents.values()].sort((a, b) => b.createdAt - a.createdAt) };
}
function scheduleDemoProgress(incident) {
  setTimeout(() => {
    if (incident.status !== 'received') return;
    incident.status = 'acknowledged';
    incident.operator = operator.name;
    incident.updatedAt = Date.now();
    emitIncident(incident);
  }, 8_000);
  setTimeout(() => {
    if (incident.status !== 'acknowledged') return;
    incident.status = 'responder_enroute';
    incident.responder = operator.unit;
    incident.updatedAt = Date.now();
    emitIncident(incident);
  }, 11_000);
}

app.get('/health', async () => ({ status: 'ok', mode: 'demo' }));
app.get('/dashboard', async (_request, reply) => reply.redirect('/dashboard/index.html'));
app.get('/api/state', async () => packet());
app.post('/auth/otp', async () => ({ accepted: true, demoCode: '000000' }));
app.post('/trips', async (request) => ({ id: `trip-${Date.now()}`, received: request.body }));

app.post('/events', async (request, reply) => {
  const key = request.headers['idempotency-key'];
  if (key && events.has(key)) return reply.code(200).send(events.get(key));
  const body = request.body;
  const result = { accepted: true, id: key ?? `event-${Date.now()}` };
  if (body?.type === 'sos.triggered') {
    const payload = body.payload ?? {};
    const incident = {
      id: payload.incidentId ?? `inc-${Date.now()}`,
      sosId: payload.sosId,
      type: payload.type ?? 'police',
      status: 'received',
      createdAt: Date.now(),
      location: payload.location ?? null,
      operator: null,
      responder: null,
      demo: true,
    };
    incidents.set(incident.id, incident);
    emitIncident(incident);
    scheduleDemoProgress(incident);
  }
  if (key) events.set(key, result);
  return result;
});

app.post('/sos', async (request, reply) => {
  const key = request.headers['idempotency-key'];
  if (key && events.has(key)) return events.get(key);
  const body = request.body ?? {};
  const incident = {
    id: body.incidentId ?? `inc-${Date.now()}`,
    sosId: body.sosId,
    type: body.type ?? 'police',
    status: 'received',
    createdAt: Date.now(),
    location: body.location ?? null,
    operator: null,
    responder: null,
    demo: true,
  };
  incidents.set(incident.id, incident);
  emitIncident(incident);
  scheduleDemoProgress(incident);
  const result = { sosId: body.sosId, incidentId: incident.id, status: incident.status };
  if (key) events.set(key, result);
  return reply.code(202).send(result);
});

app.post('/incidents/:id/:action', async (request, reply) => {
  const incident = incidents.get(request.params.id);
  if (!incident) return reply.code(404).send({ message: 'Incident not found' });
  const action = request.params.action;
  if (!['acknowledge', 'dispatch', 'resolve'].includes(action))
    return reply.code(400).send({ message: 'Unsupported action' });
  incident.status =
    action === 'acknowledge'
      ? 'acknowledged'
      : action === 'dispatch'
        ? 'responder_enroute'
        : 'resolved';
  incident.operator = action === 'acknowledge' ? operator.name : incident.operator;
  incident.responder = action === 'dispatch' ? operator.unit : incident.responder;
  incident.updatedAt = Date.now();
  emitIncident(incident);
  return incident;
});

io.on('connection', (socket) => socket.emit('state', packet()));

await app.listen({ port: 4000, host: '0.0.0.0' });
