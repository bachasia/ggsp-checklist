import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { getCached, setCached } from './cache.js';
import { runCrawler } from './crawler/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Active jobs: jobId → { emitters: Set, results: [], done: bool, summary, error }
const jobs = new Map();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// POST /api/audit — start audit job
app.post('/api/audit', async (req, res) => {
  const { url } = req.body || {};

  // Validate URL
  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'URL không hợp lệ. Phải bắt đầu bằng http:// hoặc https://' });
  }

  const domain = parsed.hostname;

  // Cache hit — return immediately
  const cached = getCached(domain);
  if (cached) {
    return res.json({ cached: true, results: cached.results, summary: cached.summary });
  }

  // Create job
  const jobId = randomUUID();
  const job = { emitters: new Set(), results: [], done: false, summary: null, error: null };
  jobs.set(jobId, job);

  // Run crawler async, emit results as they arrive
  runCrawler(url, (result) => {
    job.results.push(result);
    for (const emit of job.emitters) emit({ type: 'result', data: result });
  })
    .then((summary) => {
      job.done = true;
      job.summary = summary;
      setCached(domain, job.results, summary);
      for (const emit of job.emitters) emit({ type: 'done', data: summary });
      // Cleanup job after 5 min
      setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
    })
    .catch((err) => {
      job.done = true;
      job.error = err.message;
      for (const emit of job.emitters) emit({ type: 'error', data: { message: err.message } });
      setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
    });

  res.json({ jobId });
});

// GET /api/audit/stream/:jobId — SSE stream
app.get('/api/audit/stream/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job không tồn tại hoặc đã hết hạn' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay buffered results (for late subscribers)
  for (const result of job.results) send('result', result);

  if (job.done) {
    if (job.error) send('error', { message: job.error });
    else send('done', job.summary);
    res.end();
    return;
  }

  // Register live emitter
  const emitter = ({ type, data }) => {
    send(type, data);
    if (type === 'done' || type === 'error') res.end();
  };

  job.emitters.add(emitter);
  req.on('close', () => job.emitters.delete(emitter));
});

app.listen(PORT, () => {
  console.log(`GMC Audit API running on http://localhost:${PORT}`);
});
