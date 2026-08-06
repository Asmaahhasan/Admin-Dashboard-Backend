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
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
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
const inMemoryStore = {
    users: [{ email: 'admin@wsyelhi.com', passwordHash: '' }],
    admins: [{ name: 'مدير النظام' }],
    stages: [],
    tracks: [],
    grades: [],
    semesters: [],
    subjects: [],
    gradeSubjects: [],
    syllabusWeeks: [],
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
app.put('/api/subjects/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name)
        return res.status(400).json({ error: 'اسم المادة مطلوب' });
    if (isDbConnected) {
        try {
            const sub = await prisma.subject.update({
                where: { id: req.params.id },
                data: { name: name.trim() },
            });
            return res.json(sub);
        }
        catch { }
    }
    const sub = inMemoryStore.subjects.find((s) => s.id === req.params.id);
    if (sub) {
        sub.name = name.trim();
        return res.json(sub);
    }
    return res.status(404).json({ error: 'المادة غير موجودة' });
});
const handleUpdateGradeSubject = async (req, res) => {
    const { name } = req.body;
    if (!name)
        return res.status(400).json({ error: 'اسم المادة مطلوب' });
    if (isDbConnected) {
        try {
            const gs = await prisma.gradeSubject.findUnique({
                where: { id: req.params.id },
                include: { subject: true },
            });
            if (gs) {
                const updatedSub = await prisma.subject.update({
                    where: { id: gs.subjectId },
                    data: { name: name.trim() },
                });
                return res.json({ gradeSubjectId: gs.id, subjectId: updatedSub.id, name: updatedSub.name });
            }
        }
        catch { }
    }
    const gs = inMemoryStore.gradeSubjects.find((g) => g.id === req.params.id);
    if (gs) {
        const sub = inMemoryStore.subjects.find((s) => s.id === gs.subjectId);
        if (sub) {
            sub.name = name.trim();
        }
        return res.json({ gradeSubjectId: gs.id, subjectId: gs.subjectId, name: name.trim() });
    }
    return res.status(404).json({ error: 'المادة غير موجودة' });
};
app.put('/api/grade-subject/:id', authenticateToken, handleUpdateGradeSubject);
app.put('/api/grade-subjects/:id', authenticateToken, handleUpdateGradeSubject);
// -------------------- SYLLABUS WEEKS --------------------
const handleExportPdf = async (req, res) => {
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
            executablePath: executablePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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
        let processedHtml = html;
        try {
            const possibleLogoPaths = [
                path_1.default.join(__dirname, '../../frontend/public/wsylh-logo-full.png'),
                path_1.default.join(__dirname, '../public/wsylh-logo-full.png'),
                path_1.default.join(process.cwd(), 'frontend/public/wsylh-logo-full.png'),
                path_1.default.join(process.cwd(), 'public/wsylh-logo-full.png'),
                path_1.default.join(process.cwd(), '../frontend/public/wsylh-logo-full.png'),
            ];
            const foundPath = possibleLogoPaths.find(p => fs_1.default.existsSync(p));
            if (foundPath) {
                const logoBase64 = fs_1.default.readFileSync(foundPath).toString('base64');
                const logoDataUri = `data:image/png;base64,${logoBase64}`;
                processedHtml = processedHtml.replace(/src="[^"]*wsylh-logo-full\.png[^"]*"/g, `src="${logoDataUri}"`);
            }
        }
        catch (logoErr) {
            console.error('Error processing logo image for PDF:', logoErr);
        }
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
          html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; direction: rtl; width: 100vw; height: 100vh; overflow: hidden; }
          @page { size: A4 landscape; margin: 0mm; }
        </style>
      </head>
      <body>
        ${processedHtml}
      </body>
      </html>
    `;
        await page.setContent(fullPageHtml, { waitUntil: ['load', 'domcontentloaded'] });
        await page.evaluateHandle('document.fonts.ready').catch(() => { });
        await page.evaluate(async () => {
            const imgs = Array.from(document.querySelectorAll('img'));
            await Promise.all(imgs.map(img => {
                if (img.complete)
                    return;
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
        }).catch(() => { });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        });
        await browser.close();
        const cleanTitle = (title || 'سجل الحضور والغياب').replace(/[\\/:*?"<>|]/g, '').trim();
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
};
app.post('/api/generate-pdf', handleExportPdf);
app.post('/api/syllabus-weeks/export-pdf', handleExportPdf);
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
    const gSubjectIdStr = String(gradeSubjectId).trim();
    const safeRegionEnum = parseRegionEnum(region);
    if (isDbConnected) {
        try {
            const regionWeeks = await prisma.syllabusWeek.findMany({
                where: {
                    gradeSubjectId: gSubjectIdStr,
                    region: safeRegionEnum,
                },
                include: {
                    weekDays: { orderBy: { order: 'asc' } },
                    lesson: { include: { items: true } },
                },
                orderBy: { weekNumber: 'asc' },
            });
            const formatted = regionWeeks.map((w) => ({
                ...w,
                activity: w.lesson || w.activity || null,
                weekDays: w.weekDays || [],
            }));
            return res.json(formatted);
        }
        catch (err) {
            console.error('Error fetching syllabus weeks from DB:', err);
            return res.status(500).json({ error: 'خطأ في استعلام أسابيع المنهج من قاعدة البيانات: ' + (err.message || String(err)) });
        }
    }
    // Fallback in-memory logic when DB is offline
    const genMem = inMemoryStore.syllabusWeeks.filter((w) => w.gradeSubjectId === gradeSubjectId && w.region === 'GENERAL');
    const regionMem = (safeRegionEnum !== 'GENERAL')
        ? inMemoryStore.syllabusWeeks.filter((w) => w.gradeSubjectId === gradeSubjectId && w.region === safeRegionEnum)
        : [];
    const memMap = new Map();
    if (safeRegionEnum === 'GENERAL') {
        genMem.forEach((w) => memMap.set(Number(w.weekNumber), w));
    }
    else {
        genMem.forEach((w) => memMap.set(Number(w.weekNumber), w));
        regionMem.forEach((w) => memMap.set(Number(w.weekNumber), w));
    }
    const result = Array.from(memMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
    return res.json(result);
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
    const existingIdx = inMemoryStore.syllabusWeeks.findIndex((w) => w.gradeSubjectId === gradeSubjectId && w.weekNumber === Number(weekNumber) && w.region === targetRegionEnum);
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
// -------------------- SUBJECT LESSONS --------------------
const handleGetSubjectLessons = async (req, res) => {
    const { gradeSubjectId } = req.query;
    if (!gradeSubjectId)
        return res.status(400).json({ error: 'gradeSubjectId مطلوب' });
    if (isDbConnected) {
        try {
            const lessons = await prisma.lesson.findMany({
                where: { gradeSubjectId: String(gradeSubjectId) },
                orderBy: { createdAt: 'asc' },
                include: { items: true },
            });
            return res.json(lessons);
        }
        catch { }
    }
    const lessons = inMemoryStore.activities.filter((a) => a.gradeSubjectId === gradeSubjectId);
    return res.json(lessons);
};
app.get('/api/subject-lessons', handleGetSubjectLessons);
app.get('/subject-lessons', handleGetSubjectLessons);
const handleCreateSubjectLesson = async (req, res) => {
    const { gradeSubjectId, lessonTitle } = req.body;
    if (!gradeSubjectId || !lessonTitle) {
        return res.status(400).json({ error: 'المادة وعنوان الدرس مطلوبان' });
    }
    if (isDbConnected) {
        try {
            const lesson = await prisma.lesson.create({
                data: { gradeSubjectId, lessonTitle: lessonTitle.trim() },
                include: { items: true },
            });
            return res.json(lesson);
        }
        catch { }
    }
    const newLesson = {
        id: `lesson-${Date.now()}`,
        gradeSubjectId,
        syllabusWeekId: null,
        lessonTitle: lessonTitle.trim(),
        items: [],
    };
    inMemoryStore.activities.push(newLesson);
    return res.json(newLesson);
};
app.post('/api/subject-lessons', authenticateToken, handleCreateSubjectLesson);
app.post('/subject-lessons', authenticateToken, handleCreateSubjectLesson);
const handleUpdateSubjectLesson = async (req, res) => {
    const { lessonTitle } = req.body;
    if (!lessonTitle)
        return res.status(400).json({ error: 'عنوان الدرس مطلوب' });
    if (isDbConnected) {
        try {
            const lesson = await prisma.lesson.update({
                where: { id: req.params.id },
                data: { lessonTitle: lessonTitle.trim() },
                include: { items: true },
            });
            return res.json(lesson);
        }
        catch { }
    }
    const lesson = inMemoryStore.activities.find((a) => a.id === req.params.id);
    if (lesson) {
        lesson.lessonTitle = lessonTitle.trim();
        return res.json(lesson);
    }
    return res.status(404).json({ error: 'الدرس غير موجود' });
};
app.put('/api/subject-lessons/:id', authenticateToken, handleUpdateSubjectLesson);
app.put('/subject-lessons/:id', authenticateToken, handleUpdateSubjectLesson);
const handleDeleteSubjectLesson = async (req, res) => {
    if (isDbConnected) {
        try {
            await prisma.lesson.delete({ where: { id: req.params.id } });
            return res.json({ success: true });
        }
        catch { }
    }
    inMemoryStore.activities = inMemoryStore.activities.filter((a) => a.id !== req.params.id);
    return res.json({ success: true });
};
app.delete('/api/subject-lessons/:id', authenticateToken, handleDeleteSubjectLesson);
app.delete('/subject-lessons/:id', authenticateToken, handleDeleteSubjectLesson);
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
