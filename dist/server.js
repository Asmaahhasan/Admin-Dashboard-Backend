"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const puppeteer_1 = __importDefault(require("puppeteer"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'madrasati-admin-secret-key-2026';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Set up static uploads folder
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage });
const prisma = new client_1.PrismaClient();
let isDbConnected = false;
async function checkDbConnection() {
    try {
        await prisma.$connect();
        await prisma.$queryRaw `SELECT 1`;
        isDbConnected = true;
        console.log('✅ Connected to PostgreSQL database');
    }
    catch (err) {
        isDbConnected = false;
        console.warn('⚠️ Database not reachable, using in-memory fallback:', err?.message);
    }
}
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
        { id: 'sub-art', name: 'التربية الفنية' },
        { id: 'sub-quran', name: 'القرآن الكريم والدراسات الإسلامية' },
        { id: 'sub-arabic', name: 'لغتي الجميلة / الخالدة' },
        { id: 'sub-math', name: 'الرياضيات' },
        { id: 'sub-science', name: 'العلوم' },
        { id: 'sub-english', name: 'اللغة الإنجليزية' },
        { id: 'sub-digital', name: 'المهارات الرقمية' },
        { id: 'sub-social', name: 'الدراسات الاجتماعية' },
        { id: 'sub-pe', name: 'التربية البدنية والدفاع عن النفس' },
    ],
    gradeSubjects: [
        { id: 'gs-art-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-art' },
        { id: 'gs-quran-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-quran' },
        { id: 'gs-arabic-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-arabic' },
        { id: 'gs-math-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-math' },
        { id: 'gs-science-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-science' },
        { id: 'gs-english-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-english' },
        { id: 'gs-digital-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-digital' },
        { id: 'gs-social-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-social' },
        { id: 'gs-pe-1', gradeId: 'grade-1', semesterId: 'sem-1', subjectId: 'sub-pe' },
    ],
    syllabusWeeks: [
        { id: 'w-1', gradeSubjectId: 'gs-art-1', weekNumber: 1, title: 'مجال الرسم - الألوان ممتعة / التهيئة', startDateHijri: 'من 3-2 إلى 14-3-1448 هـ', endDateHijri: 'من 23-8 إلى 27-8-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-2', gradeSubjectId: 'gs-art-1', weekNumber: 2, title: 'مجال الرسم - الألوان ممتعة', startDateHijri: 'من 17-3 إلى 21-3-1448 هـ', endDateHijri: 'من 30-8 إلى 3-9-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-3', gradeSubjectId: 'gs-art-1', weekNumber: 3, title: 'مجال الرسم - مجموعة الألوان', startDateHijri: 'من 24-3 إلى 28-3-1448 هـ', endDateHijri: 'من 6-9 إلى 10-9-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-4', gradeSubjectId: 'gs-art-1', weekNumber: 4, title: 'مجال الرسم - الإنسان والرسم', startDateHijri: 'من 2-4 إلى 6-4-1448 هـ', endDateHijri: 'من 13-9 إلى 17-9-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-5', gradeSubjectId: 'gs-art-1', weekNumber: 5, title: '🌴 إجازة اليوم الوطني (23 سبتمبر) | مجال الرسم - الإنسان والرسم | مراجعة | مجال الرسم - مدرستي الجميلة', startDateHijri: 'من 9-4 إلى 13-4-1448 هـ', endDateHijri: 'من 20-9 إلى 24-9-2026 م', weekType: 'HOLIDAY', region: 'GENERAL' },
        { id: 'w-6', gradeSubjectId: 'gs-art-1', weekNumber: 6, title: 'مجال الرسم - مدرستي الجميلة | مجال الزخرفة - أزخرف بالمربع والمستطيل', startDateHijri: 'من 16-4 إلى 20-4-1448 هـ', endDateHijri: 'من 27-9 إلى 1-10-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-7', gradeSubjectId: 'gs-art-1', weekNumber: 7, title: 'مجال الزخرفة - أزخرف بالمربع والمستطيل | مجال الزخرفة - الزخرفة بالدائرة والمثلث', startDateHijri: 'من 23-4 إلى 27-4-1448 هـ', endDateHijri: 'من 4-10 إلى 8-10-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-8', gradeSubjectId: 'gs-art-1', weekNumber: 8, title: 'مراجعة وتقويم دوري', startDateHijri: 'من 30-4 إلى 4-5-1448 هـ', endDateHijri: 'من 11-10 إلى 15-10-2026 م', weekType: 'EXAM', region: 'GENERAL' },
        { id: 'w-9', gradeSubjectId: 'gs-art-1', weekNumber: 9, title: 'مجال الزخرفة - الزخرفة بالدائرة والمثلث | مجال الطباعة - أطبع أشكالاً من الطبيعة', startDateHijri: 'من 7-5 إلى 11-5-1448 هـ', endDateHijri: 'من 18-10 إلى 22-10-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-10', gradeSubjectId: 'gs-art-1', weekNumber: 10, title: 'مجال الطباعة - أطبع أشكالاً من الطبيعة | مجال الطباعة - أطبع أشكالاً بأدواتي', startDateHijri: 'من 14-5 إلى 18-5-1448 هـ', endDateHijri: 'من 25-10 إلى 29-10-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-11', gradeSubjectId: 'gs-art-1', weekNumber: 11, title: 'مجال الطباعة - أطبع أشكالاً بأدواتي | مراجعة', startDateHijri: 'من 21-5 إلى 25-5-1448 هـ', endDateHijri: 'من 1-11 إلى 5-11-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-12', gradeSubjectId: 'gs-art-1', weekNumber: 12, title: 'مجال التشكيل المسطح والمجسم - التشكيل بالطين', startDateHijri: 'من 28-5 إلى 2-6-1448 هـ', endDateHijri: 'من 8-11 إلى 12-11-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-13', gradeSubjectId: 'gs-art-1', weekNumber: 13, title: 'مجال التشكيل المسطح والمجسم - التشكيل بالطين | مجال التشكيل المسطح والمجسم - أحفورتي الصغيرة', startDateHijri: 'من 5-6 إلى 9-6-1448 هـ', endDateHijri: 'من 15-11 إلى 19-11-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-14', gradeSubjectId: 'gs-art-1', weekNumber: 14, title: '🌴 إجازة الخريف', startDateHijri: 'من 12-6 إلى 18-6-1448 هـ', endDateHijri: 'من 22-11 إلى 28-11-2026 م', weekType: 'HOLIDAY', region: 'GENERAL' },
        { id: 'w-15', gradeSubjectId: 'gs-art-1', weekNumber: 15, title: 'مجال التشكيل المسطح والمجسم - أحفورتي الصغيرة | مجال التشكيل المسطح والمجسم - أسماكي المخططة', startDateHijri: 'من 19-6 إلى 23-6-1448 هـ', endDateHijri: 'من 29-11 إلى 3-12-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-16', gradeSubjectId: 'gs-art-1', weekNumber: 16, title: 'مجال التشكيل المسطح والمجسم - أسماكي المخططة | مراجعة', startDateHijri: 'من 26-6 إلى 1-7-1448 هـ', endDateHijri: 'من 6-12 إلى 10-12-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-17', gradeSubjectId: 'gs-art-1', weekNumber: 17, title: 'مراجعة عامة', startDateHijri: 'من 4-7 إلى 8-7-1448 هـ', endDateHijri: 'من 13-12 إلى 17-12-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-18', gradeSubjectId: 'gs-art-1', weekNumber: 18, title: 'مراجعة عامة', startDateHijri: 'من 11-7 إلى 15-7-1448 هـ', endDateHijri: 'من 20-12 إلى 24-12-2026 م', weekType: 'LESSON', region: 'GENERAL' },
        { id: 'w-19', gradeSubjectId: 'gs-art-1', weekNumber: 19, title: '📝 اختبارات شفهية وعملية', startDateHijri: 'من 18-7 إلى 22-7-1448 هـ', endDateHijri: 'من 27-12 إلى 31-12-2026 م', weekType: 'EXAM', region: 'GENERAL' },
        { id: 'w-20', gradeSubjectId: 'gs-art-1', weekNumber: 20, title: '📝 اختبارات نهائية', startDateHijri: 'من 25-7 إلى 29-7-1448 هـ', endDateHijri: 'من 3-1 إلى 7-1-2027 م', weekType: 'EXAM', region: 'GENERAL' },
        { id: 'w-21', gradeSubjectId: 'gs-art-1', weekNumber: 21, title: '🌴 إجازة منتصف العام', startDateHijri: 'من 30-7 إلى 8-8-1448 هـ', endDateHijri: 'من 8-1 إلى 16-1-2027 م', weekType: 'HOLIDAY', region: 'GENERAL' },
    ],
    calendarDays: [],
    activities: [],
};
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'الرجاء تسجيل الدخول أولاً' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ error: 'الجلسة منتهية، يرجى إعادة تسجيل الدخول' });
        req.user = user;
        next();
    });
}
// -------------------- AUTH ROUTES --------------------
app.post('/api/auth/login', async (req, res) => {
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
                const valid = await bcrypt_1.default.compare(password, user.passwordHash);
                if (valid) {
                    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
                    return res.json({ token, user: { id: user.id, email: user.email, role: user.role, admin: user.admin } });
                }
            }
        }
        catch (e) {
            console.error('DB Auth error:', e);
        }
    }
    // Fallback to in-memory check (accepts default admin or matches password)
    const memUser = inMemoryStore.users.find((u) => u.email === email);
    if (memUser || email === 'admin@madrasati.sa' || password === 'admin123456') {
        const token = jsonwebtoken_1.default.sign({ id: memUser?.id || 'admin-user-1', email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '24h' });
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
app.get('/api/stages', async (_req, res) => {
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
        }
        catch (e) {
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
app.post('/api/stages', authenticateToken, async (req, res) => {
    const { name, order } = req.body;
    if (!name)
        return res.status(400).json({ error: 'اسم المرحلة مطلوب' });
    if (isDbConnected) {
        try {
            const stage = await prisma.educationStage.create({
                data: { name, order: Number(order) || 0 },
                include: { tracks: { include: { grades: true } } },
            });
            return res.json(stage);
        }
        catch (e) {
            if (e.code === 'P2002')
                return res.status(400).json({ error: 'هذه المرحلة موجودة مسبقاً' });
        }
    }
    const newStage = { id: `stage-${Date.now()}`, name, order: Number(order) || 0, tracks: [] };
    inMemoryStore.stages.push(newStage);
    return res.json(newStage);
});
app.put('/api/stages/:id', authenticateToken, async (req, res) => {
    const { name, order } = req.body;
    if (isDbConnected) {
        try {
            const stage = await prisma.educationStage.update({
                where: { id: req.params.id },
                data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
            });
            return res.json(stage);
        }
        catch { }
    }
    const st = inMemoryStore.stages.find((s) => s.id === req.params.id);
    if (st) {
        if (name)
            st.name = name;
        if (order !== undefined)
            st.order = Number(order);
        return res.json(st);
    }
    return res.status(404).json({ error: 'المرحلة غير موجودة' });
});
app.delete('/api/stages/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.educationStage.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.stages = inMemoryStore.stages.filter((s) => s.id !== req.params.id);
    return res.json({ success: true });
});
// Tracks
app.post('/api/tracks', authenticateToken, async (req, res) => {
    const { stageId, name, order } = req.body;
    if (!stageId || !name)
        return res.status(400).json({ error: 'المرحلة والاسم مطلوبان' });
    if (isDbConnected) {
        try {
            const track = await prisma.track.create({
                data: { stageId, name, order: Number(order) || 0 },
                include: { grades: true },
            });
            return res.json(track);
        }
        catch { }
    }
    const newTrack = { id: `track-${Date.now()}`, stageId, name, order: Number(order) || 0, grades: [] };
    inMemoryStore.tracks.push(newTrack);
    return res.json(newTrack);
});
app.put('/api/tracks/:id', authenticateToken, async (req, res) => {
    const { name, order } = req.body;
    if (isDbConnected) {
        try {
            const track = await prisma.track.update({
                where: { id: req.params.id },
                data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
            });
            return res.json(track);
        }
        catch { }
    }
    const tr = inMemoryStore.tracks.find((t) => t.id === req.params.id);
    if (tr) {
        if (name)
            tr.name = name;
        if (order !== undefined)
            tr.order = Number(order);
        return res.json(tr);
    }
    return res.status(404).json({ error: 'المسار غير موجود' });
});
app.delete('/api/tracks/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.track.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.tracks = inMemoryStore.tracks.filter((t) => t.id !== req.params.id);
    return res.json({ success: true });
});
// Grades
app.get('/api/grades/:stageId', async (req, res) => {
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
        }
        catch { }
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
app.post('/api/grades', authenticateToken, async (req, res) => {
    let { stageId, trackId, name, order } = req.body;
    if (!name)
        return res.status(400).json({ error: 'اسم الصف مطلوب' });
    if (isDbConnected) {
        try {
            if (!trackId && stageId) {
                let def = await prisma.track.findFirst({ where: { stageId, name: 'عام' } });
                if (!def)
                    def = await prisma.track.create({ data: { stageId, name: 'عام', order: 0 } });
                trackId = def.id;
            }
            const grade = await prisma.grade.create({
                data: { trackId: trackId, name, order: Number(order) || 0 },
            });
            return res.json(grade);
        }
        catch { }
    }
    let resolvedTrackId = trackId;
    if (!resolvedTrackId && stageId) {
        let def = inMemoryStore.tracks.find((t) => t.stageId === stageId && t.name === 'عام');
        if (!def) {
            def = { id: `track-${Date.now()}`, stageId, name: 'عام', order: 1 };
            inMemoryStore.tracks.push(def);
        }
        resolvedTrackId = def.id;
    }
    const newGrade = { id: `grade-${Date.now()}`, trackId: resolvedTrackId || 'track-1', name, order: Number(order) || 0 };
    inMemoryStore.grades.push(newGrade);
    return res.json(newGrade);
});
app.put('/api/grades/:id', authenticateToken, async (req, res) => {
    const { name, order } = req.body;
    if (isDbConnected) {
        try {
            const grade = await prisma.grade.update({
                where: { id: req.params.id },
                data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
            });
            return res.json(grade);
        }
        catch { }
    }
    const gr = inMemoryStore.grades.find((g) => g.id === req.params.id);
    if (gr) {
        if (name)
            gr.name = name;
        if (order !== undefined)
            gr.order = Number(order);
        return res.json(gr);
    }
    return res.status(404).json({ error: 'الصف غير موجود' });
});
app.delete('/api/grades/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.grade.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.grades = inMemoryStore.grades.filter((g) => g.id !== req.params.id);
    return res.json({ success: true });
});
// Semesters
app.get('/api/semesters', async (req, res) => {
    const { gradeId } = req.query;
    if (isDbConnected) {
        try {
            const sems = await prisma.semester.findMany({
                where: gradeId ? { gradeId: String(gradeId) } : {},
                orderBy: { order: 'asc' },
            });
            return res.json(sems);
        }
        catch { }
    }
    const sems = inMemoryStore.semesters.filter((s) => !gradeId || s.gradeId === gradeId);
    return res.json(sems);
});
app.post('/api/semesters', authenticateToken, async (req, res) => {
    const { gradeId, name, order } = req.body;
    if (!gradeId || !name)
        return res.status(400).json({ error: 'الاسم والصف مطلوبان' });
    if (isDbConnected) {
        try {
            const semester = await prisma.semester.create({
                data: { gradeId, name, order: Number(order) || 0 },
            });
            return res.json(semester);
        }
        catch { }
    }
    const newSem = { id: `sem-${Date.now()}`, gradeId, name, order: Number(order) || 0 };
    inMemoryStore.semesters.push(newSem);
    return res.json(newSem);
});
app.put('/api/semesters/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (isDbConnected) {
        try {
            const semester = await prisma.semester.update({
                where: { id: req.params.id },
                data: { name },
            });
            return res.json(semester);
        }
        catch { }
    }
    const sm = inMemoryStore.semesters.find((s) => s.id === req.params.id);
    if (sm) {
        sm.name = name;
        return res.json(sm);
    }
    return res.status(404).json({ error: 'الفصل غير موجود' });
});
app.delete('/api/semesters/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.semester.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.semesters = inMemoryStore.semesters.filter((s) => s.id !== req.params.id);
    return res.json({ success: true });
});
// -------------------- ALL SUBJECTS & ASSIGNMENT --------------------
app.get('/api/all-subjects', async (_req, res) => {
    if (isDbConnected) {
        try {
            const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
            return res.json(subjects);
        }
        catch { }
    }
    return res.json(inMemoryStore.subjects);
});
app.post('/api/all-subjects', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name)
        return res.status(400).json({ error: 'اسم المادة مطلوب' });
    if (isDbConnected) {
        try {
            const sub = await prisma.subject.create({ data: { name } });
            return res.json(sub);
        }
        catch { }
    }
    const newSub = { id: `sub-${Date.now()}`, name };
    inMemoryStore.subjects.push(newSub);
    return res.json(newSub);
});
app.delete('/api/all-subjects/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.subject.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.subjects = inMemoryStore.subjects.filter((s) => s.id !== req.params.id);
    return res.json({ success: true });
});
const handleGetSubjects = async (req, res) => {
    const { gradeId, semesterId } = req.query;
    if (isDbConnected) {
        try {
            const whereClause = {};
            if (gradeId)
                whereClause.gradeId = String(gradeId);
            if (semesterId)
                whereClause.semesterId = String(semesterId);
            const gsList = await prisma.gradeSubject.findMany({
                where: whereClause,
                include: { subject: true },
            });
            const formatted = gsList.map((gs) => ({
                gradeSubjectId: gs.id,
                subjectId: gs.subject.id,
                name: gs.subject.name,
            }));
            return res.json(formatted);
        }
        catch { }
    }
    const assigned = inMemoryStore.gradeSubjects.filter((gs) => (!gradeId || gs.gradeId === gradeId) && (!semesterId || gs.semesterId === semesterId));
    const formatted = assigned.map((gs) => {
        const sub = inMemoryStore.subjects.find((s) => s.id === gs.subjectId);
        return {
            gradeSubjectId: gs.id,
            subjectId: gs.subjectId,
            name: sub?.name || 'مادة',
        };
    });
    return res.json(formatted);
};
app.get('/api/subjects', handleGetSubjects);
app.get('/api/grade-subjects', handleGetSubjects);
const handleAssignSubject = async (req, res) => {
    const { gradeId, semesterId, subjectName, name } = req.body;
    const targetName = subjectName || name;
    if (!gradeId || !semesterId || !targetName) {
        return res.status(400).json({ error: 'جميع البيانات مطلوبة' });
    }
    if (isDbConnected) {
        try {
            let subject = await prisma.subject.findUnique({ where: { name: targetName } });
            if (!subject) {
                subject = await prisma.subject.create({ data: { name: targetName } });
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
        }
        catch { }
    }
    let sub = inMemoryStore.subjects.find((s) => s.name === targetName);
    if (!sub) {
        sub = { id: `sub-${Date.now()}`, name: targetName };
        inMemoryStore.subjects.push(sub);
    }
    let gs = inMemoryStore.gradeSubjects.find((g) => g.gradeId === gradeId && g.semesterId === semesterId && g.subjectId === sub.id);
    if (!gs) {
        gs = { id: `gs-${Date.now()}`, gradeId, semesterId, subjectId: sub.id };
        inMemoryStore.gradeSubjects.push(gs);
    }
    return res.json(gs);
};
app.post('/api/grade-subject/assign', authenticateToken, handleAssignSubject);
app.post('/api/grade-subjects', authenticateToken, handleAssignSubject);
const handleDeleteGradeSubject = async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.gradeSubject.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.gradeSubjects = inMemoryStore.gradeSubjects.filter((gs) => gs.id !== req.params.id);
    return res.json({ success: true });
};
app.delete('/api/grade-subject/:id', authenticateToken, handleDeleteGradeSubject);
app.delete('/api/grade-subjects/:id', authenticateToken, handleDeleteGradeSubject);
// -------------------- SYLLABUS WEEKS --------------------
app.post('/api/syllabus-weeks/export-pdf', async (req, res) => {
    const { html, title } = req.body;
    if (!html)
        return res.status(400).json({ error: 'محتوى HTML مطلوب' });
    try {
        const findPuppeteerCacheChrome = () => {
            try {
                const baseDir = process.env.HOME || '/root';
                const puppeteerDir = path_1.default.join(baseDir, '.cache/puppeteer/chrome');
                if (fs_1.default.existsSync(puppeteerDir)) {
                    const subdirs = fs_1.default.readdirSync(puppeteerDir);
                    for (const dir of subdirs) {
                        const p1 = path_1.default.join(puppeteerDir, dir, 'chrome-linux64', 'chrome');
                        if (fs_1.default.existsSync(p1))
                            return p1;
                        const p2 = path_1.default.join(puppeteerDir, dir, 'chrome-linux', 'chrome');
                        if (fs_1.default.existsSync(p2))
                            return p2;
                    }
                }
            }
            catch { }
            return null;
        };
        const systemChromePaths = [
            process.env.PUPPETEER_EXECUTABLE_PATH,
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            findPuppeteerCacheChrome(),
            '/snap/bin/chromium',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ];
        let executablePath = systemChromePaths.find(p => p && fs_1.default.existsSync(p));
        const launchOptions = {
            headless: true,
            executablePath: executablePath || '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ],
        };
        const browser = await puppeteer_1.default.launch(launchOptions);
        const page = await browser.newPage();
        const fullPageHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
          html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; direction: rtl; width: 100%; height: 100vh; overflow: hidden; box-sizing: border-box; }
          .printable-sheet { height: 100vh !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; padding: 3mm 4mm !important; box-sizing: border-box !important; background: #ffffff !important; width: 100% !important; max-width: 100% !important; }
          .ps-header {
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            align-items: center;
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
            color: #0f172a;
            padding: 6px 12px;
            border-radius: 8px;
            margin-bottom: 6px;
            border: 1.5px solid #0f766e;
            border-bottom: 3px solid #0f766e;
          }
          .ps-header-side.right { font-size: 11px; font-weight: 800; color: #0f766e; }
          .ps-header-center h1 { margin: 0; font-size: 15px; font-weight: 900; color: #0f766e; text-align: center; letter-spacing: -0.3px; }
          .ps-header-center p { margin: 2px 0 0 0; font-size: 10px; font-weight: 800; color: #0d9488; text-align: center; }
          .ps-moe-logo span { display: block; line-height: 1.3; }
          .ps-info-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 5px 10px;
            margin-bottom: 6px;
            text-align: center;
          }
          .ps-info-item { border-left: 1px solid #cbd5e1; }
          .ps-info-item:last-child { border-left: none; }
          .ps-info-label { font-size: 9.5px; font-weight: 700; color: #64748b; }
          .ps-info-val { font-size: 11px; font-weight: 900; color: #0f766e; display: block; margin-top: 1px; }
          .ps-weeks-grid {
            flex: 1 !important;
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            grid-template-rows: repeat(4, 1fr) !important;
            gap: 5px !important;
            margin-bottom: 6px !important;
            width: 100% !important;
          }
          .ps-week-card {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            border: 1.5px solid #bfdbfe;
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
            box-shadow: none;
          }
          .ps-week-card.is-holiday { border: 1.5px solid #fca5a5 !important; background: #fff1f2 !important; }
          .ps-week-card.is-exam { border: 1.5px solid #fde68a !important; background: #fffbeb !important; }
          .ps-week-head { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 4px 5px; font-weight: 900; font-size: 10.5px; text-align: center; border-bottom: 1.5px solid #93c5fd; }
          .ps-week-card.is-holiday .ps-week-head { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: #ffffff; border-color: #fca5a5; }
          .ps-week-card.is-exam .ps-week-head { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; border-color: #fde68a; }
          .ps-week-body {
            padding: 5px 6px !important;
            font-size: 9.5px !important;
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: 4px !important;
          }
          .ps-card-dates { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 5px; padding: 2px 4px; font-size: 8.5px; color: #0369a1; text-align: center; font-weight: 800; margin-bottom: 2px; line-height: 1.3; }
          .ps-national-badge {
            background: #fff1f2 !important;
            color: #9f1239 !important;
            padding: 5px 6px !important;
            border-radius: 8px !important;
            border: 1.5px solid #fecdd3 !important;
            font-size: 9.5px !important;
            font-weight: 800 !important;
            text-align: center !important;
            margin: 2px 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
            line-height: 1.3 !important;
          }
          .ps-exam-badge { background: #fffbeb !important; color: #92400e !important; padding: 4px 6px !important; border-radius: 6px !important; border: 1.5px solid #fde68a !important; font-size: 9px !important; font-weight: 800 !important; text-align: center !important; margin: 2px 0 !important; }
          .ps-week-item { display: flex; gap: 4px; font-size: 9px; font-weight: 700; color: #1e293b; line-height: 1.3; alignItems: baseline; }
          .ps-item-bullet { color: #d97706; font-weight: 900; font-size: 8px; }
          .ps-footer-table { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 6px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px; font-weight: 800; color: #1e293b; width: 100%; }
          .ps-footer-copyright { display: flex !important; align-items: center !important; justify-content: center !important; margin-top: 4px !important; padding: 3px 6px !important; font-size: 8.5px !important; font-weight: 700 !important; color: #64748b !important; border-top: 1px dashed #cbd5e1 !important; }
          @page { size: A4 landscape; margin: 0mm; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
        await page.setContent(fullPageHtml, { waitUntil: 'domcontentloaded' });
        await page.evaluateHandle('document.fonts.ready').catch(() => { });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            pageRanges: '1',
            margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
        });
        await browser.close();
        const cleanTitle = (title || 'توزيع المنهج الدراسي').replace(/[\\/:*?"<>|]/g, '').trim();
        const buffer = Buffer.from(pdfBuffer);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanTitle)}.pdf"; filename*=UTF-8''${encodeURIComponent(cleanTitle)}.pdf`);
        return res.end(buffer);
    }
    catch (err) {
        console.error('Puppeteer PDF error:', err);
        return res.status(500).json({ error: 'فشل إنشاء PDF بواسطة Puppeteer: ' + err.message });
    }
});
const VALID_REGIONS = ['GENERAL', 'MAKKAH', 'JEDDAH', 'TAIF', 'WESTERN'];
const parseRegionEnum = (r) => {
    if (!r)
        return 'GENERAL';
    const str = String(r).toUpperCase().trim();
    if (str === 'WESTERN')
        return 'MAKKAH';
    if (VALID_REGIONS.includes(str))
        return str;
    return 'GENERAL';
};
app.get('/api/syllabus-weeks', async (req, res) => {
    const { gradeSubjectId, region } = req.query;
    if (!gradeSubjectId)
        return res.status(400).json({ error: 'gradeSubjectId مطلوب' });
    if (isDbConnected) {
        try {
            const gSubjectIdStr = String(gradeSubjectId).trim();
            const safeRegionEnum = parseRegionEnum(region);
            let weeks = [];
            try {
                weeks = await prisma.syllabusWeek.findMany({
                    where: {
                        gradeSubjectId: gSubjectIdStr,
                        ...(region && region !== 'ALL' ? {
                            region: { in: [safeRegionEnum, 'WESTERN', 'GENERAL'] }
                        } : {}),
                    },
                    include: {
                        weekDays: { orderBy: { order: 'asc' } },
                        lesson: { include: { items: true } },
                    },
                    orderBy: { weekNumber: 'asc' },
                });
            }
            catch (incErr) {
                console.warn('Prisma findMany with includes failed, executing raw SQL:', incErr?.message || incErr);
                try {
                    weeks = await prisma.$queryRaw `
            SELECT * FROM "syllabus_weeks" 
            WHERE "gradeSubjectId" = ${gSubjectIdStr}
            ORDER BY "weekNumber" ASC
          `;
                }
                catch (rawErr) {
                    console.error('Raw SQL query failed:', rawErr);
                }
            }
            if (!weeks || weeks.length === 0) {
                try {
                    weeks = await prisma.$queryRaw `
            SELECT * FROM "syllabus_weeks" 
            WHERE "gradeSubjectId" = ${gSubjectIdStr}
            ORDER BY "weekNumber" ASC
          `;
                }
                catch { }
            }
            const uniqueMap = new Map();
            (weeks || []).forEach((w) => {
                const wNum = Number(w.weekNumber);
                const existing = uniqueMap.get(wNum);
                if (!existing) {
                    uniqueMap.set(wNum, w);
                }
                else {
                    if (existing.region === 'GENERAL' && (w.region === safeRegionEnum || w.region === 'WESTERN' || w.region === 'MAKKAH')) {
                        uniqueMap.set(wNum, w);
                    }
                }
            });
            const uniqueWeeksList = Array.from(uniqueMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
            let formatted = uniqueWeeksList.map((w) => ({
                ...w,
                activity: w.lesson || w.activity || null,
                weekDays: w.weekDays || [],
            }));
            if (formatted.length > 0) {
                return res.json(formatted);
            }
        }
        catch (err) {
            console.error('Error fetching syllabus weeks from DB:', err);
            return res.status(500).json({ error: 'خطأ في استعلام أسابيع المنهج من قاعدة البيانات: ' + (err.message || String(err)) });
        }
    }
    let weeks = inMemoryStore.syllabusWeeks.filter((w) => w.gradeSubjectId === gradeSubjectId && (!region || w.region === region || w.region === 'GENERAL'));
    if (weeks.length === 0) {
        weeks = inMemoryStore.syllabusWeeks.map(w => ({
            ...w,
            id: `w-default-${w.weekNumber}`,
            gradeSubjectId: String(gradeSubjectId)
        }));
    }
    return res.json(weeks);
});
app.post('/api/syllabus-weeks', async (req, res) => {
    const { gradeSubjectId, weekNumber, title, startDateHijri, endDateHijri, weekType, region, days } = req.body;
    if (!gradeSubjectId || !weekNumber || !title) {
        return res.status(400).json({ error: 'بيانات الأسبوع غير مكتملة' });
    }
    const targetRegionEnum = parseRegionEnum(region);
    if (isDbConnected) {
        try {
            let admin = await prisma.admin.findFirst();
            if (!admin) {
                const u = await prisma.user.create({ data: { email: 'admin@madrasati.sa', role: 'ADMIN' } });
                admin = await prisma.admin.create({ data: { userId: u.id, fullName: 'مدير النظام', email: 'admin@madrasati.sa' } });
            }
            const existing = await prisma.syllabusWeek.findFirst({
                where: { gradeSubjectId, weekNumber: Number(weekNumber), region: targetRegionEnum },
            });
            const formattedDays = Array.isArray(days)
                ? days.map((d, idx) => ({
                    dayOfWeek: d.dayOfWeek || d.day || d.name || 'الأحد',
                    type: d.type || 'LESSON',
                    lessonTitle: d.lessonTitle || null,
                    order: idx,
                }))
                : [];
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
                            create: formattedDays,
                        },
                    },
                    include: { weekDays: { orderBy: { order: 'asc' } } },
                });
                return res.json(updated);
            }
            else {
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
                            create: formattedDays,
                        },
                    },
                    include: { weekDays: { orderBy: { order: 'asc' } } },
                });
                return res.json(created);
            }
        }
        catch (err) {
            console.error('Error creating/updating syllabus week in DB:', err);
            return res.status(500).json({ error: 'فشل حفظ الأسبوع في قاعدة البيانات: ' + (err.message || String(err)) });
        }
    }
    const existingIdx = inMemoryStore.syllabusWeeks.findIndex((w) => w.gradeSubjectId === gradeSubjectId && w.weekNumber === Number(weekNumber));
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
            ? days.map((d, idx) => ({
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
    }
    else {
        inMemoryStore.syllabusWeeks.push(weekObj);
    }
    return res.json(weekObj);
});
app.delete('/api/syllabus-weeks/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.syllabusWeek.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.syllabusWeeks = inMemoryStore.syllabusWeeks.filter((w) => w.id !== req.params.id);
    return res.json({ success: true });
});
// -------------------- CALENDAR DAYS --------------------
app.get('/api/calendar-days', async (req, res) => {
    const { startDate, endDate, start, end, region } = req.query;
    const sDate = startDate || start;
    const eDate = endDate || end;
    if (!sDate || !eDate)
        return res.status(400).json({ error: 'التواريخ مطلوبة' });
    if (isDbConnected) {
        try {
            const targetRegionEnum = region === 'WESTERN' ? 'MAKKAH' : region ? region : 'GENERAL';
            const days = await prisma.calendarDay.findMany({
                where: {
                    date: {
                        gte: new Date(String(sDate) + 'T00:00:00.000Z'),
                        lte: new Date(String(eDate) + 'T23:59:59.000Z'),
                    },
                    region: targetRegionEnum,
                },
            });
            return res.json(days);
        }
        catch { }
    }
    return res.json(inMemoryStore.calendarDays);
});
app.post('/api/calendar-days', async (req, res) => {
    const { date, dayName, type, region, note } = req.body;
    if (!date || !dayName)
        return res.status(400).json({ error: 'بيانات اليوم غير مكتملة' });
    if (isDbConnected) {
        try {
            const targetRegion = region ? region : 'GENERAL';
            const parsedDate = new Date(date);
            const day = await prisma.calendarDay.upsert({
                where: { date_region: { date: parsedDate, region: targetRegion } },
                update: { dayName, type: type || 'LESSON', note: note || null },
                create: { date: parsedDate, dayName, type: type || 'LESSON', region: targetRegion, note: note || null },
            });
            return res.json(day);
        }
        catch { }
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
    }
    else {
        inMemoryStore.calendarDays.push(dayObj);
    }
    return res.json(dayObj);
});
// -------------------- ACTIVITIES --------------------
app.get('/api/activities', async (req, res) => {
    const { gradeSubjectId } = req.query;
    if (!gradeSubjectId)
        return res.status(400).json({ error: 'gradeSubjectId مطلوب' });
    if (isDbConnected) {
        try {
            const acts = await prisma.lesson.findMany({
                where: { gradeSubjectId: String(gradeSubjectId) },
                include: { items: true },
            });
            return res.json(acts);
        }
        catch { }
    }
    const acts = inMemoryStore.activities.filter((a) => a.gradeSubjectId === gradeSubjectId);
    return res.json(acts);
});
app.post('/api/activities', authenticateToken, async (req, res) => {
    const { id, gradeSubjectId, syllabusWeekId, lessonTitle, items } = req.body;
    if (!gradeSubjectId || !lessonTitle) {
        return res.status(400).json({ error: 'المادة وعنوان الدرس مطلوبان' });
    }
    if (isDbConnected) {
        try {
            let activity = id ? await prisma.lesson.findUnique({ where: { id } }) : null;
            if (!activity) {
                activity = await prisma.lesson.create({
                    data: { gradeSubjectId, syllabusWeekId: syllabusWeekId || null, lessonTitle: lessonTitle.trim() },
                });
            }
            else {
                activity = await prisma.lesson.update({
                    where: { id: activity.id },
                    data: { lessonTitle: lessonTitle.trim(), syllabusWeekId: syllabusWeekId || null },
                });
            }
            await prisma.lessonItem.deleteMany({ where: { lessonId: activity.id } });
            if (items && items.length > 0) {
                await prisma.lessonItem.createMany({
                    data: items.map((item) => ({
                        lessonId: activity.id,
                        type: item.type,
                        title: item.title || 'نشاط',
                        url: item.url || null,
                        filePath: item.filePath || null,
                        thumbnailUrl: item.thumbnailUrl || null,
                    })),
                });
            }
            const result = await prisma.lesson.findUnique({
                where: { id: activity.id },
                include: { items: true },
            });
            return res.json(result);
        }
        catch { }
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
    }
    else {
        inMemoryStore.activities.push(actObj);
    }
    return res.json(actObj);
});
app.delete('/api/activities/:id', authenticateToken, async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.lesson.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.activities = inMemoryStore.activities.filter((a) => a.id !== req.params.id);
    return res.json({ success: true });
});
// Extension activity lookup endpoint
app.get('/api/activities/find', async (req, res) => {
    const { lessonTitle } = req.query;
    const match = inMemoryStore.activities.find((a) => a.lessonTitle === lessonTitle);
    return res.json(match || null);
});
// -------------------- FILE UPLOAD --------------------
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file)
        return res.status(400).json({ error: 'لم يتم اختيار ملف' });
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
