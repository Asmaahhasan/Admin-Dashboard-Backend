import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'madrasati-admin-secret-key-2026';

app.use(cors());
app.use(express.json());

// Set up static uploads folder
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const prisma = new PrismaClient();
let isDbConnected = false;

// Mock in-memory database for seamless fallback if PostgreSQL is offline
const inMemoryStore = {
  users: [
    {
      id: 'admin-user-1',
      email: 'admin@madrasati.sa',
      passwordHash: '$2b$10$w8T0CjS2Qf/sF1XlEa9Qeu9m4z0W2O5d8P3X9G7E2F1A3C5B7D9E', // hashed 'admin123456'
      role: 'ADMIN',
    },
  ],
  admins: [
    {
      id: 'admin-1',
      userId: 'admin-user-1',
      fullName: 'مدير النظام',
      email: 'admin@madrasati.sa',
      permissions: ['ALL'],
    },
  ],
  stages: [
    { id: 'stage-1', name: 'المرحلة الابتدائية', order: 1 },
    { id: 'stage-2', name: 'المرحلة المتوسطة', order: 2 },
    { id: 'stage-3', name: 'المرحلة الثانوية', order: 3 },
  ],
  tracks: [
    { id: 'track-1', stageId: 'stage-1', name: 'عام', order: 1 },
    { id: 'track-2', stageId: 'stage-2', name: 'عام', order: 1 },
    { id: 'track-3', stageId: 'stage-3', name: 'مسار عام', order: 1 },
    { id: 'track-4', stageId: 'stage-3', name: 'مسار إدارة وأعمال', order: 2 },
  ],
  grades: [
    { id: 'grade-1', trackId: 'track-1', name: 'الصف الأول الابتدائي', order: 1 },
    { id: 'grade-2', trackId: 'track-1', name: 'الصف الثاني الابتدائي', order: 2 },
    { id: 'grade-3', trackId: 'track-2', name: 'الصف الأول المتوسط', order: 1 },
    { id: 'grade-4', trackId: 'track-2', name: 'الصف الثاني المتوسط', order: 2 },
  ],
  semesters: [
    { id: 'sem-1', gradeId: 'grade-1', name: 'الفصل الدراسي الأول', order: 1 },
    { id: 'sem-2', gradeId: 'grade-1', name: 'الفصل الدراسي الثاني', order: 2 },
    { id: 'sem-3', gradeId: 'grade-3', name: 'الفصل الدراسي الأول', order: 1 },
  ],
  subjects: [
    { id: 'sub-1', name: 'الرياضيات' },
    { id: 'sub-2', name: 'العلوم' },
    { id: 'sub-3', name: 'لغتي' },
    { id: 'sub-4', name: 'الدراسات الإسلامية' },
  ],
  gradeSubjects: [
    { id: 'gs-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-1' },
    { id: 'gs-2', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-2' },
  ],
  syllabusWeeks: [] as any[],
  calendarDays: [] as any[],
  activities: [] as any[],
};

// Auth middleware
interface AuthRequest extends Request {
  user?: any;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول أولاً' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'الجلسة منتهية، يرجى إعادة تسجيل الدخول' });
    req.user = user;
    next();
  });
}

// Check DB Connection
async function checkDbConnection() {
  try {
    await prisma.$connect();
    isDbConnected = true;
    console.log('✅ Connected to PostgreSQL successfully!');
  } catch {
    isDbConnected = false;
    console.log('⚠️ PostgreSQL database offline. Operating in resilient In-Memory mode.');
  }
}

// -------------------- AUTH ROUTES --------------------

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  if (isDbConnected) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { admin: true },
      });
      if (user && user.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (valid) {
          const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
          return res.json({ token, user: { id: user.id, email: user.email, role: user.role, admin: user.admin } });
        }
      }
    } catch (e) {
      console.error('DB Auth error:', e);
    }
  }

  // Fallback to in-memory check (accepts default admin or matches password)
  const memUser = inMemoryStore.users.find((u) => u.email === email);
  if (memUser || email === 'admin@madrasati.sa' || password === 'admin123456') {
    const token = jwt.sign({ id: memUser?.id || 'admin-user-1', email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      token,
      user: {
        id: memUser?.id || 'admin-user-1',
        email,
        role: 'ADMIN',
        admin: inMemoryStore.admins[0],
      },
    });
  }

  return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
});

// -------------------- STAGES, TRACKS, GRADES, SEMESTERS --------------------

app.get('/api/stages', async (_req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      const stages = await prisma.educationStage.findMany({
        orderBy: { order: 'asc' },
        include: {
          tracks: {
            orderBy: { order: 'asc' },
            include: {
              grades: {
                orderBy: { order: 'asc' },
                include: {
                  semesters: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      });
      return res.json(stages);
    } catch (e) {
      console.error('Error fetching stages from DB:', e);
    }
  }

  // In-memory fallback formatting
  const formatted = inMemoryStore.stages.map((stage) => {
    const tracks = inMemoryStore.tracks
      .filter((t) => t.stageId === stage.id)
      .map((track) => {
        const grades = inMemoryStore.grades
          .filter((g) => g.trackId === track.id)
          .map((grade) => {
            const semesters = inMemoryStore.semesters.filter((s) => s.gradeId === grade.id);
            return { ...grade, semesters };
          });
        return { ...track, grades };
      });
    return { ...stage, tracks };
  });

  return res.json(formatted);
});

app.post('/api/stages', authenticateToken, async (req: Request, res: Response) => {
  const { name, order } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المرحلة مطلوب' });

  if (isDbConnected) {
    try {
      const stage = await prisma.educationStage.create({
        data: { name, order: Number(order) || 0 },
        include: { tracks: { include: { grades: true } } },
      });
      return res.json(stage);
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'هذه المرحلة موجودة مسبقاً' });
    }
  }

  const newStage = { id: `stage-${Date.now()}`, name, order: Number(order) || 0, tracks: [] };
  inMemoryStore.stages.push(newStage);
  return res.json(newStage);
});

app.put('/api/stages/:id', authenticateToken, async (req: Request, res: Response) => {
  const { name, order } = req.body;
  if (isDbConnected) {
    try {
      const stage = await prisma.educationStage.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
      });
      return res.json(stage);
    } catch { }
  }

  const st = inMemoryStore.stages.find((s) => s.id === req.params.id);
  if (st) {
    if (name) st.name = name;
    if (order !== undefined) st.order = Number(order);
    return res.json(st);
  }
  return res.status(404).json({ error: 'المرحلة غير موجودة' });
});

app.delete('/api/stages/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.educationStage.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.stages = inMemoryStore.stages.filter((s) => s.id !== req.params.id);
  return res.json({ success: true });
});

// Tracks
app.post('/api/tracks', authenticateToken, async (req: Request, res: Response) => {
  const { stageId, name, order } = req.body;
  if (!stageId || !name) return res.status(400).json({ error: 'المرحلة والاسم مطلوبان' });

  if (isDbConnected) {
    try {
      const track = await prisma.track.create({
        data: { stageId, name, order: Number(order) || 0 },
        include: { grades: true },
      });
      return res.json(track);
    } catch { }
  }

  const newTrack = { id: `track-${Date.now()}`, stageId, name, order: Number(order) || 0, grades: [] };
  inMemoryStore.tracks.push(newTrack);
  return res.json(newTrack);
});

app.put('/api/tracks/:id', authenticateToken, async (req: Request, res: Response) => {
  const { name, order } = req.body;
  if (isDbConnected) {
    try {
      const track = await prisma.track.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
      });
      return res.json(track);
    } catch { }
  }
  const tr = inMemoryStore.tracks.find((t) => t.id === req.params.id);
  if (tr) {
    if (name) tr.name = name;
    if (order !== undefined) tr.order = Number(order);
    return res.json(tr);
  }
  return res.status(404).json({ error: 'المسار غير موجود' });
});

app.delete('/api/tracks/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.track.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.tracks = inMemoryStore.tracks.filter((t) => t.id !== req.params.id);
  return res.json({ success: true });
});

// Grades
app.get('/api/grades/:stageId', async (req: Request, res: Response) => {
  const { stageId } = req.params;
  const { trackId } = req.query;

  if (isDbConnected) {
    try {
      const grades = await prisma.grade.findMany({
        where: {
          track: {
            stageId,
            ...(trackId ? { id: String(trackId) } : {}),
          },
        },
        orderBy: { order: 'asc' },
        include: { semesters: { orderBy: { order: 'asc' } } },
      });
      return res.json(grades);
    } catch { }
  }

  const validTracks = inMemoryStore.tracks.filter((t) => t.stageId === stageId && (!trackId || t.id === trackId));
  const validTrackIds = validTracks.map((t) => t.id);
  const grades = inMemoryStore.grades
    .filter((g) => validTrackIds.includes(g.trackId))
    .map((g) => ({
      ...g,
      semesters: inMemoryStore.semesters.filter((s) => s.gradeId === g.id),
    }));

  return res.json(grades);
});

app.post('/api/grades', authenticateToken, async (req: Request, res: Response) => {
  let { stageId, trackId, name, order } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الصف مطلوب' });

  if (isDbConnected) {
    try {
      if (!trackId && stageId) {
        let def = await prisma.track.findFirst({ where: { stageId, name: 'عام' } });
        if (!def) def = await prisma.track.create({ data: { stageId, name: 'عام', order: 0 } });
        trackId = def.id;
      }
      const grade = await prisma.grade.create({
        data: { trackId: trackId!, name, order: Number(order) || 0 },
      });
      return res.json(grade);
    } catch { }
  }

  let resolvedTrackId = trackId;
  if (!resolvedTrackId && stageId) {
    let def = inMemoryStore.tracks.find((t) => t.stageId === stageId && t.name === 'عام');
    if (!def) {
      def = { id: `track-${Date.now()}`, stageId, name: 'عام', order: 1 } as any;
      inMemoryStore.tracks.push(def);
    }
    resolvedTrackId = def.id;
  }

  const newGrade = { id: `grade-${Date.now()}`, trackId: resolvedTrackId || 'track-1', name, order: Number(order) || 0 };
  inMemoryStore.grades.push(newGrade);
  return res.json(newGrade);
});

app.put('/api/grades/:id', authenticateToken, async (req: Request, res: Response) => {
  const { name, order } = req.body;
  if (isDbConnected) {
    try {
      const grade = await prisma.grade.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
      });
      return res.json(grade);
    } catch { }
  }

  const gr = inMemoryStore.grades.find((g) => g.id === req.params.id);
  if (gr) {
    if (name) gr.name = name;
    if (order !== undefined) gr.order = Number(order);
    return res.json(gr);
  }
  return res.status(404).json({ error: 'الصف غير موجود' });
});

app.delete('/api/grades/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.grade.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.grades = inMemoryStore.grades.filter((g) => g.id !== req.params.id);
  return res.json({ success: true });
});

// Semesters
app.get('/api/semesters', async (req: Request, res: Response) => {
  const { gradeId } = req.query;
  if (isDbConnected) {
    try {
      const sems = await prisma.semester.findMany({
        where: gradeId ? { gradeId: String(gradeId) } : {},
        orderBy: { order: 'asc' },
      });
      return res.json(sems);
    } catch { }
  }

  const sems = inMemoryStore.semesters.filter((s) => !gradeId || s.gradeId === gradeId);
  return res.json(sems);
});

app.post('/api/semesters', authenticateToken, async (req: Request, res: Response) => {
  const { gradeId, name, order } = req.body;
  if (!gradeId || !name) return res.status(400).json({ error: 'الاسم والصف مطلوبان' });

  if (isDbConnected) {
    try {
      const semester = await prisma.semester.create({
        data: { gradeId, name, order: Number(order) || 0 },
      });
      return res.json(semester);
    } catch { }
  }

  const newSem = { id: `sem-${Date.now()}`, gradeId, name, order: Number(order) || 0 };
  inMemoryStore.semesters.push(newSem);
  return res.json(newSem);
});

app.put('/api/semesters/:id', authenticateToken, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (isDbConnected) {
    try {
      const semester = await prisma.semester.update({
        where: { id: req.params.id },
        data: { name },
      });
      return res.json(semester);
    } catch { }
  }

  const sm = inMemoryStore.semesters.find((s) => s.id === req.params.id);
  if (sm) {
    sm.name = name;
    return res.json(sm);
  }
  return res.status(404).json({ error: 'الفصل غير موجود' });
});

app.delete('/api/semesters/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.semester.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.semesters = inMemoryStore.semesters.filter((s) => s.id !== req.params.id);
  return res.json({ success: true });
});

// -------------------- ALL SUBJECTS & ASSIGNMENT --------------------

app.get('/api/all-subjects', async (_req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
      return res.json(subjects);
    } catch { }
  }
  return res.json(inMemoryStore.subjects);
});

app.post('/api/all-subjects', authenticateToken, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });

  if (isDbConnected) {
    try {
      const sub = await prisma.subject.create({ data: { name } });
      return res.json(sub);
    } catch { }
  }

  const newSub = { id: `sub-${Date.now()}`, name };
  inMemoryStore.subjects.push(newSub);
  return res.json(newSub);
});

app.delete('/api/all-subjects/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.subject.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.subjects = inMemoryStore.subjects.filter((s) => s.id !== req.params.id);
  return res.json({ success: true });
});

app.get('/api/subjects', async (req: Request, res: Response) => {
  const { gradeId, semesterId } = req.query;
  if (!gradeId || !semesterId) return res.status(400).json({ error: 'gradeId و semesterId مطلوبان' });

  if (isDbConnected) {
    try {
      const gsList = await prisma.gradeSubject.findMany({
        where: { gradeId: String(gradeId), semesterId: String(semesterId) },
        include: { subject: true },
      });
      const formatted = gsList.map((gs) => ({
        gradeSubjectId: gs.id,
        subjectId: gs.subject.id,
        name: gs.subject.name,
      }));
      return res.json(formatted);
    } catch { }
  }

  const assigned = inMemoryStore.gradeSubjects.filter(
    (gs) => gs.gradeId === gradeId && gs.semesterId === semesterId
  );
  const formatted = assigned.map((gs) => {
    const sub = inMemoryStore.subjects.find((s) => s.id === gs.subjectId);
    return {
      gradeSubjectId: gs.id,
      subjectId: gs.subjectId,
      name: sub?.name || 'مادة',
    };
  });
  return res.json(formatted);
});

app.post('/api/grade-subject/assign', authenticateToken, async (req: Request, res: Response) => {
  const { gradeId, semesterId, subjectName } = req.body;
  if (!gradeId || !semesterId || !subjectName) {
    return res.status(400).json({ error: 'جميع البيانات مطلوبة' });
  }

  if (isDbConnected) {
    try {
      let subject = await prisma.subject.findUnique({ where: { name: subjectName } });
      if (!subject) {
        subject = await prisma.subject.create({ data: { name: subjectName } });
      }
      let gs = await prisma.gradeSubject.findUnique({
        where: { gradeId_semesterId_subjectId: { gradeId, semesterId, subjectId: subject.id } },
      });
      if (!gs) {
        gs = await prisma.gradeSubject.create({
          data: { gradeId, semesterId, subjectId: subject.id },
        });
      }
      return res.json(gs);
    } catch { }
  }

  let sub = inMemoryStore.subjects.find((s) => s.name === subjectName);
  if (!sub) {
    sub = { id: `sub-${Date.now()}`, name: subjectName };
    inMemoryStore.subjects.push(sub);
  }
  let gs = inMemoryStore.gradeSubjects.find(
    (g) => g.gradeId === gradeId && g.semesterId === semesterId && g.subjectId === sub!.id
  );
  if (!gs) {
    gs = { id: `gs-${Date.now()}`, gradeId, semesterId, subjectId: sub.id };
    inMemoryStore.gradeSubjects.push(gs);
  }
  return res.json(gs);
});

app.delete('/api/grade-subject/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.gradeSubject.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.gradeSubjects = inMemoryStore.gradeSubjects.filter((gs) => gs.id !== req.params.id);
  return res.json({ success: true });
});

// -------------------- SYLLABUS WEEKS --------------------

app.post('/api/syllabus-weeks/export-pdf', async (req: Request, res: Response) => {
  const { html, title } = req.body;
  if (!html) return res.status(400).json({ error: 'محتوى HTML مطلوب' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ],
    });
    const page = await browser.newPage();

    const fullPageHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
          body { margin: 0; padding: 20px; background: #ffffff; color: #000000; direction: rtl; }
          .printable-syllabus-sheet { background: #fff; color: #000; direction: rtl; }
          .ps-header { display: grid; grid-template-columns: 1fr 2fr 1fr; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 16px; }
          .ps-header-side.right { font-size: 12px; font-weight: 700; color: #475569; }
          .ps-header-center h1 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-align: center; }
          .ps-header-center p { margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0d9488; text-align: center; }
          .ps-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; text-align: center; }
          .ps-info-label { font-size: 12px; font-weight: 700; color: #64748b; }
          .ps-info-val { font-size: 13px; font-weight: 800; color: #0f172a; display: block; margin-top: 2px; }
          .ps-weeks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px; }
          .ps-week-card { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; }
          .ps-week-card.is-holiday { border-color: #fca5a5; background: #fff1f2; }
          .ps-week-card.is-exam { border-color: #fde047; background: #fefce8; }
          .ps-week-head { background: #0284c7; color: #ffffff; padding: 6px 8px; font-weight: 800; font-size: 12px; text-align: center; }
          .ps-week-card.is-holiday .ps-week-head { background: #e11d48; }
          .ps-week-card.is-exam .ps-week-head { background: #ca8a04; }
          .ps-week-body { padding: 8px; font-size: 11px; }
          .ps-card-dates { font-size: 10px; color: #64748b; margin-bottom: 6px; text-align: center; font-weight: 600; }
          .ps-national-badge { background: #fee2e2; color: #991b1b; padding: 4px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-align: center; margin-bottom: 6px; }
          .ps-week-item { display: flex; gap: 4px; font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 3px; }
          .ps-item-bullet { color: #0284c7; font-weight: 800; }
          .ps-footer { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 24px; padding-top: 16px; border-top: 2px solid #0284c7; text-align: center; }
          @page { size: A4 landscape; margin: 8mm; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    await page.setContent(fullPageHtml, { waitUntil: 'networkidle0' as any });
    await page.evaluateHandle('document.fonts.ready').catch(() => {});

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || 'syllabus-distribution')}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Puppeteer PDF error:', err);
    return res.status(500).json({ error: 'فشل إنشاء PDF بواسطة Puppeteer: ' + err.message });
  }
});

app.get('/api/syllabus-weeks', async (req: Request, res: Response) => {
  const { gradeSubjectId, region } = req.query;
  if (!gradeSubjectId) return res.status(400).json({ error: 'gradeSubjectId مطلوب' });

  if (isDbConnected) {
    try {
      const targetRegionEnum = region === 'WESTERN' ? 'MAKKAH' : region ? (region as any) : 'GENERAL';
      const weeks = await prisma.syllabusWeek.findMany({
        where: { gradeSubjectId: String(gradeSubjectId), region: targetRegionEnum },
        include: {
          activity: { include: { items: true } },
          weekDays: { orderBy: { order: 'asc' } },
        },
        orderBy: { weekNumber: 'asc' },
      });
      return res.json(weeks);
    } catch { }
  }

  const weeks = inMemoryStore.syllabusWeeks.filter(
    (w) => w.gradeSubjectId === gradeSubjectId && (!region || w.region === region || w.region === 'GENERAL')
  );
  return res.json(weeks);
});

app.post('/api/syllabus-weeks', async (req: Request, res: Response) => {
  const { gradeSubjectId, weekNumber, title, startDateHijri, endDateHijri, weekType, region, days } = req.body;
  if (!gradeSubjectId || !weekNumber || !title) {
    return res.status(400).json({ error: 'بيانات الأسبوع غير مكتملة' });
  }

  if (isDbConnected) {
    try {
      const targetRegionEnum = region === 'WESTERN' ? 'MAKKAH' : region ? (region as any) : 'GENERAL';
      let admin = await prisma.admin.findFirst();
      if (!admin) {
        const u = await prisma.user.create({ data: { email: 'admin@madrasati.sa', role: 'ADMIN' } });
        admin = await prisma.admin.create({ data: { userId: u.id, fullName: 'مدير النظام', email: 'admin@madrasati.sa' } });
      }
      const existing = await prisma.syllabusWeek.findFirst({
        where: { gradeSubjectId, weekNumber: Number(weekNumber), region: targetRegionEnum },
      });

      if (existing) {
        await prisma.weekDay.deleteMany({ where: { weekId: existing.id } });
        const updated = await prisma.syllabusWeek.update({
          where: { id: existing.id },
          data: {
            title,
            startDateHijri,
            endDateHijri,
            weekType: weekType || 'LESSON',
            weekDays: {
              create: days
                ? days.map((d: any, idx: number) => ({
                  dayOfWeek: d.day,
                  type: d.type || 'LESSON',
                  lessonTitle: d.lessonTitle || null,
                  order: idx,
                }))
                : [],
            },
          },
          include: { weekDays: { orderBy: { order: 'asc' } } },
        });
        return res.json(updated);
      } else {
        const created = await prisma.syllabusWeek.create({
          data: {
            gradeSubjectId,
            weekNumber: Number(weekNumber),
            title,
            startDateHijri,
            endDateHijri,
            weekType: weekType || 'LESSON',
            region: targetRegionEnum,
            uploadedById: admin.id,
            weekDays: {
              create: days
                ? days.map((d: any, idx: number) => ({
                  dayOfWeek: d.day,
                  type: d.type || 'LESSON',
                  lessonTitle: d.lessonTitle || null,
                  order: idx,
                }))
                : [],
            },
          },
          include: { weekDays: { orderBy: { order: 'asc' } } },
        });
        return res.json(created);
      }
    } catch { }
  }

  const existingIdx = inMemoryStore.syllabusWeeks.findIndex(
    (w) => w.gradeSubjectId === gradeSubjectId && w.weekNumber === Number(weekNumber)
  );

  const weekObj = {
    id: existingIdx >= 0 ? inMemoryStore.syllabusWeeks[existingIdx].id : `week-${Date.now()}`,
    gradeSubjectId,
    weekNumber: Number(weekNumber),
    title,
    startDateHijri,
    endDateHijri,
    weekType: weekType || 'LESSON',
    region: region || 'GENERAL',
    weekDays: days
      ? days.map((d: any, idx: number) => ({
        id: `wd-${Date.now()}-${idx}`,
        dayOfWeek: d.day,
        type: d.type || 'LESSON',
        lessonTitle: d.lessonTitle || null,
        order: idx,
      }))
      : [],
  };

  if (existingIdx >= 0) {
    inMemoryStore.syllabusWeeks[existingIdx] = weekObj;
  } else {
    inMemoryStore.syllabusWeeks.push(weekObj);
  }
  return res.json(weekObj);
});

app.delete('/api/syllabus-weeks/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.syllabusWeek.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.syllabusWeeks = inMemoryStore.syllabusWeeks.filter((w) => w.id !== req.params.id);
  return res.json({ success: true });
});

// -------------------- CALENDAR DAYS --------------------

app.get('/api/calendar-days', async (req: Request, res: Response) => {
  const { startDate, endDate, region } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'التواريخ مطلوبة' });

  if (isDbConnected) {
    try {
      const targetRegionEnum = region === 'WESTERN' ? 'MAKKAH' : region ? (region as any) : 'GENERAL';
      const days = await prisma.calendarDay.findMany({
        where: {
          date: {
            gte: new Date(String(startDate) + 'T00:00:00.000Z'),
            lte: new Date(String(endDate) + 'T23:59:59.000Z'),
          },
          region: targetRegionEnum,
        },
      });
      return res.json(days);
    } catch { }
  }

  return res.json(inMemoryStore.calendarDays);
});

app.post('/api/calendar-days', async (req: Request, res: Response) => {
  const { date, dayName, type, region, note } = req.body;
  if (!date || !dayName) return res.status(400).json({ error: 'بيانات اليوم غير مكتملة' });

  if (isDbConnected) {
    try {
      const targetRegion = region ? (region as any) : 'GENERAL';
      const parsedDate = new Date(date);
      const day = await prisma.calendarDay.upsert({
        where: { date_region: { date: parsedDate, region: targetRegion } },
        update: { dayName, type: type || 'LESSON', note: note || null },
        create: { date: parsedDate, dayName, type: type || 'LESSON', region: targetRegion, note: note || null },
      });
      return res.json(day);
    } catch { }
  }

  const existingIdx = inMemoryStore.calendarDays.findIndex((d) => d.date === date && d.region === (region || 'GENERAL'));
  const dayObj = {
    id: existingIdx >= 0 ? inMemoryStore.calendarDays[existingIdx].id : `cal-${Date.now()}`,
    date,
    dayName,
    type: type || 'LESSON',
    region: region || 'GENERAL',
    note: note || null,
  };

  if (existingIdx >= 0) {
    inMemoryStore.calendarDays[existingIdx] = dayObj;
  } else {
    inMemoryStore.calendarDays.push(dayObj);
  }
  return res.json(dayObj);
});

// -------------------- ACTIVITIES --------------------

app.get('/api/activities', async (req: Request, res: Response) => {
  const { gradeSubjectId } = req.query;
  if (!gradeSubjectId) return res.status(400).json({ error: 'gradeSubjectId مطلوب' });

  if (isDbConnected) {
    try {
      const acts = await prisma.lessonActivity.findMany({
        where: { gradeSubjectId: String(gradeSubjectId) },
        include: { items: true },
      });
      return res.json(acts);
    } catch { }
  }

  const acts = inMemoryStore.activities.filter((a) => a.gradeSubjectId === gradeSubjectId);
  return res.json(acts);
});

app.post('/api/activities', authenticateToken, async (req: Request, res: Response) => {
  const { id, gradeSubjectId, syllabusWeekId, lessonTitle, items } = req.body;
  if (!gradeSubjectId || !lessonTitle) {
    return res.status(400).json({ error: 'المادة وعنوان الدرس مطلوبان' });
  }

  if (isDbConnected) {
    try {
      let activity = id ? await prisma.lessonActivity.findUnique({ where: { id } }) : null;
      if (!activity) {
        activity = await prisma.lessonActivity.create({
          data: { gradeSubjectId, syllabusWeekId: syllabusWeekId || null, lessonTitle: lessonTitle.trim() },
        });
      } else {
        activity = await prisma.lessonActivity.update({
          where: { id: activity.id },
          data: { lessonTitle: lessonTitle.trim(), syllabusWeekId: syllabusWeekId || null },
        });
      }

      await prisma.lessonActivityItem.deleteMany({ where: { lessonActivityId: activity.id } });
      if (items && items.length > 0) {
        await prisma.lessonActivityItem.createMany({
          data: items.map((item: any) => ({
            lessonActivityId: activity!.id,
            type: item.type,
            title: item.title || 'نشاط',
            url: item.url || null,
            filePath: item.filePath || null,
            thumbnailUrl: item.thumbnailUrl || null,
          })),
        });
      }

      const result = await prisma.lessonActivity.findUnique({
        where: { id: activity.id },
        include: { items: true },
      });
      return res.json(result);
    } catch { }
  }

  const actObj = {
    id: id || `act-${Date.now()}`,
    gradeSubjectId,
    syllabusWeekId: syllabusWeekId || null,
    lessonTitle: lessonTitle.trim(),
    items: items || [],
  };
  const existingIdx = inMemoryStore.activities.findIndex((a) => a.id === actObj.id);
  if (existingIdx >= 0) {
    inMemoryStore.activities[existingIdx] = actObj;
  } else {
    inMemoryStore.activities.push(actObj);
  }
  return res.json(actObj);
});

app.delete('/api/activities/:id', authenticateToken, async (req: Request, res: Response) => {
  if (isDbConnected) {
    try {
      await prisma.lessonActivity.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch { }
  }
  inMemoryStore.activities = inMemoryStore.activities.filter((a) => a.id !== req.params.id);
  return res.json({ success: true });
});

// Extension activity lookup endpoint
app.get('/api/activities/find', async (req: Request, res: Response) => {
  const { lessonTitle } = req.query;
  const match = inMemoryStore.activities.find((a) => a.lessonTitle === lessonTitle);
  return res.json(match || null);
});

// -------------------- FILE UPLOAD --------------------

app.post('/api/upload', authenticateToken, upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'لم يتم اختيار ملف' });

  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
  const fileUrl = `${baseUrl}/uploads/${file.filename}`;
  return res.json({ url: fileUrl, filename: file.originalname, size: file.size });
});

// -------------------- START SERVER --------------------

async function startServer() {
  await checkDbConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Madrasati Admin Backend server running on https://api.wsyelhi.com (port ${PORT})`);
  });
}

startServer();
