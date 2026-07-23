import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-admin';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Setup static uploads serving
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// JWT Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired.' });
    }
    req.user = user;
    next();
  });
}

// -------------------- AUTHENTICATION --------------------

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== 'ADMIN' || !user.passwordHash) {
      return res.status(401).json({ error: 'بيانات الاعتماد غير صالحة أو المستخدم ليس مشرفاً.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء تسجيل الدخول.' });
  }
});

// -------------------- CURRICULUM DATA --------------------

app.get('/api/stages', async (req, res) => {
  try {
    const stages = await prisma.educationStage.findMany({
      include: {
        tracks: {
          include: {
            grades: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المراحل الدراسية.' });
  }
});

app.get('/api/semesters', async (req, res) => {
  const { gradeId } = req.query;
  try {
    const whereClause = gradeId ? { gradeId: String(gradeId) } : {};
    const semesters = await prisma.semester.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الفصول الدراسية.' });
  }
});

app.get('/api/grades/:stageId', async (req, res) => {
  const { stageId } = req.params;
  const { trackId } = req.query;

  try {
    if (trackId && trackId !== 'all' && trackId !== 'none') {
      const grades = await prisma.grade.findMany({
        where: { trackId: String(trackId) },
        orderBy: { order: 'asc' },
      });
      return res.json(grades);
    }

    const grades = await prisma.grade.findMany({
      where: {
        track: { stageId },
      },
      orderBy: { order: 'asc' },
    });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الصفوف.' });
  }
});

app.get('/api/subjects', async (req, res) => {
  const { gradeId, semesterId } = req.query;
  if (!gradeId || !semesterId) {
    return res.status(400).json({ error: 'معرف الصف ومعرف الترم مطلوبان.' });
  }

  try {
    const gradeSubjects = await prisma.gradeSubject.findMany({
      where: {
        gradeId: String(gradeId),
        semesterId: String(semesterId),
      },
      include: {
        subject: true,
      },
    });

    const formatted = gradeSubjects.map((gs) => ({
      gradeSubjectId: gs.id,
      subjectId: gs.subject.id,
      name: gs.subject.name,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المواد.' });
  }
});

app.post('/api/grade-subject/assign', authenticateToken, async (req, res) => {
  const { gradeId, semesterId, subjectName } = req.body;
  if (!gradeId || !semesterId || !subjectName) {
    return res.status(400).json({ error: 'تأكد من اختيار الصف والترم وكتابة المادة.' });
  }

  try {
    let subject = await prisma.subject.findFirst({
      where: { name: String(subjectName) },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: { name: String(subjectName) },
      });
    }

    let gs = await prisma.gradeSubject.findFirst({
      where: {
        gradeId: String(gradeId),
        semesterId: String(semesterId),
        subjectId: subject.id,
      },
    });

    if (!gs) {
      gs = await prisma.gradeSubject.create({
        data: {
          gradeId: String(gradeId),
          semesterId: String(semesterId),
          subjectId: subject.id,
        },
      });
    }

    res.json(gs);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء إسناد المادة.' });
  }
});

app.delete('/api/grade-subject/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.gradeSubject.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'تعذر حذف المادة، تأكد من حذف محتويات المادة (الأنشطة والأسابيع) أولاً.' });
  }
});

// -------------------- SYLLABUS WEEKS --------------------

app.get('/api/syllabus-weeks', async (req, res) => {
  const { gradeSubjectId } = req.query;
  if (!gradeSubjectId) {
    return res.status(400).json({ error: 'gradeSubjectId مطلوب.' });
  }

  try {
    const weeks = await prisma.syllabusWeek.findMany({
      where: { gradeSubjectId: String(gradeSubjectId) },
      include: {
        activity: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { weekNumber: 'asc' },
    });
    res.json(weeks);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأسابيع الدراسية.' });
  }
});

app.post('/api/syllabus-weeks', authenticateToken, async (req: any, res) => {
  const { gradeSubjectId, weekNumber, title, startDateHijri, endDateHijri, weekType } = req.body;
  if (!gradeSubjectId || !weekNumber || !title) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة لتسجيل أسبوع المنهج.' });
  }

  const validWeekTypes = ['LESSON', 'HOLIDAY', 'EXAM'];
  const resolvedType = validWeekTypes.includes(weekType) ? weekType : 'LESSON';

  try {
    const admin = await prisma.admin.findUnique({
      where: { userId: req.user.id },
    });
    if (!admin) {
      return res.status(403).json({ error: 'هذا الإجراء متاح فقط للمشرفين.' });
    }

    const existing = await prisma.syllabusWeek.findFirst({
      where: {
        gradeSubjectId,
        weekNumber: Number(weekNumber),
      },
    });

    let week;
    if (existing) {
      week = await prisma.syllabusWeek.update({
        where: { id: existing.id },
        data: {
          title,
          startDateHijri: startDateHijri || null,
          endDateHijri: endDateHijri || null,
          weekType: resolvedType,
          uploadedById: admin.id,
        },
      });
    } else {
      week = await prisma.syllabusWeek.create({
        data: {
          gradeSubjectId,
          weekNumber: Number(weekNumber),
          title,
          startDateHijri: startDateHijri || null,
          endDateHijri: endDateHijri || null,
          weekType: resolvedType,
          uploadedById: admin.id,
        },
      });
    }

    res.json(week);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ أسبوع المنهج.' });
  }
});

app.delete('/api/syllabus-weeks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.syllabusWeek.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء حذف أسبوع المنهج.' });
  }
});

// -------------------- ACTIVITIES (1:N ITEMS) --------------------

app.get('/api/activities', async (req, res) => {
  const { gradeSubjectId } = req.query;
  if (!gradeSubjectId) {
    return res.status(400).json({ error: 'gradeSubjectId مطلوب.' });
  }

  try {
    const activities = await prisma.lessonActivity.findMany({
      where: { gradeSubjectId: String(gradeSubjectId) },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأنشطة.' });
  }
});

app.post('/api/activities', authenticateToken, async (req, res) => {
  const { id, gradeSubjectId, syllabusWeekId, lessonTitle, items } = req.body;
  if (!gradeSubjectId || !lessonTitle) {
    return res.status(400).json({ error: 'المادة وعنوان الدرس مطلوبان.' });
  }

  try {
    // 1. Find or create the container LessonActivity
    let activity = null;
    if (id) {
      activity = await prisma.lessonActivity.findUnique({ where: { id } });
    }
    if (!activity) {
      activity = await prisma.lessonActivity.findFirst({
        where: {
          gradeSubjectId,
          OR: [
            syllabusWeekId ? { syllabusWeekId } : null,
            { lessonTitle },
          ].filter(Boolean) as any,
        },
      });
    }

    if (!activity) {
      activity = await prisma.lessonActivity.create({
        data: {
          gradeSubjectId,
          syllabusWeekId: syllabusWeekId || null,
          lessonTitle: lessonTitle.trim(),
        },
      });
    } else {
      activity = await prisma.lessonActivity.update({
        where: { id: activity.id },
        data: {
          lessonTitle: lessonTitle.trim(),
          syllabusWeekId: syllabusWeekId || null,
        },
      });
    }

    // 2. Cascade delete existing items
    await prisma.lessonActivityItem.deleteMany({
      where: { lessonActivityId: activity.id },
    });

    // 3. Create target items
    if (items && items.length > 0) {
      await prisma.lessonActivityItem.createMany({
        data: items.map((item: any) => ({
          lessonActivityId: activity.id,
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

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ الأنشطة.' });
  }
});

app.delete('/api/activities/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.lessonActivity.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء حذف النشاط.' });
  }
});

// -------------------- FILE UPLOADS --------------------

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'لم يتم رفع ملف.' });
  }
  const fileUrl = `http://localhost:4001/uploads/${file.filename}`;
  res.json({
    url: fileUrl,
    filename: file.originalname,
    size: file.size,
  });
});

// -------------------- PUBLIC EXTENSION ENDPOINT --------------------

app.get('/api/activities/find', async (req, res) => {
  const { stage, grade, semester, subject, lessonTitle } = req.query;
  if (!stage || !grade || !semester || !subject || !lessonTitle) {
    return res.status(400).json({ error: 'المعلومات المطلوبة للاستعلام ناقصة.' });
  }

  try {
    // Find matching GradeSubject by text relations
    const gsList = await prisma.gradeSubject.findMany({
      where: {
        grade: {
          name: { contains: String(grade).trim(), mode: 'insensitive' },
        },
        semester: { name: { contains: String(semester).trim(), mode: 'insensitive' } },
        subject: { name: { contains: String(subject).trim(), mode: 'insensitive' } },
      },
      include: {
        grade: {
          include: {
            track: {
              include: { stage: true }
            }
          }
        }
      }
    });

    const cleanStage = String(stage).trim().toLowerCase();
    const gs = gsList.find(g => {
      const stageName = g.grade?.track?.stage?.name || '';
      return stageName.toLowerCase().includes(cleanStage) || cleanStage.includes(stageName.toLowerCase());
    }) || gsList[0];

    if (!gs) {
      return res.json(null);
    }

    const activity = await prisma.lessonActivity.findFirst({
      where: {
        gradeSubjectId: gs.id,
        OR: [
          { lessonTitle: { equals: String(lessonTitle), mode: 'insensitive' } },
          { syllabusWeek: { title: { equals: String(lessonTitle), mode: 'insensitive' } } },
        ],
      },
      include: {
        items: true,
      },
    });

    res.json(activity);
  } catch (error) {
    console.error('Find activities error:', error);
    res.status(500).json({ error: 'حدث خطأ في خادم لوحة التحكم.' });
  }
});

// -------------------- CONTENT MANAGEMENT CRUD --------------------

// ── Stages ──
app.post('/api/stages', authenticateToken, async (req, res) => {
  const { name, order } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المرحلة مطلوب.' });
  try {
    const stage = await prisma.educationStage.create({
      data: { name, order: Number(order) || 0 },
      include: { tracks: { include: { grades: true } } },
    });
    res.json(stage);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'هذه المرحلة موجودة مسبقاً.' });
    res.status(500).json({ error: 'خطأ في إنشاء المرحلة.' });
  }
});

app.put('/api/stages/:id', authenticateToken, async (req, res) => {
  const { name, order } = req.body;
  try {
    const stage = await prisma.educationStage.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
      include: { tracks: { include: { grades: true } } },
    });
    res.json(stage);
  } catch { res.status(500).json({ error: 'خطأ في تحديث المرحلة.' }); }
});

app.delete('/api/stages/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.educationStage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في حذف المرحلة. تأكد من حذف الصفوف أولاً.' }); }
});

// ── Tracks ──
app.post('/api/tracks', authenticateToken, async (req, res) => {
  const { stageId, name, order } = req.body;
  if (!stageId || !name) return res.status(400).json({ error: 'معرف المرحلة والاسم مطلوبان.' });
  try {
    const track = await prisma.track.create({
      data: { stageId, name, order: Number(order) || 0 },
      include: { grades: true },
    });
    res.json(track);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'هذا المسار موجود مسبقاً في هذه المرحلة.' });
    res.status(500).json({ error: 'خطأ في إنشاء المسار.' });
  }
});

app.put('/api/tracks/:id', authenticateToken, async (req, res) => {
  const { name, order } = req.body;
  try {
    const track = await prisma.track.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
      include: { grades: true },
    });
    res.json(track);
  } catch { res.status(500).json({ error: 'خطأ في تحديث المسار.' }); }
});

app.delete('/api/tracks/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.track.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في حذف المسار. تأكد من حذف الصفوف أولاً.' }); }
});

// ── Grades ──
app.post('/api/grades', authenticateToken, async (req, res) => {
  let { trackId, stageId, name, order } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الصف مطلوب.' });
  try {
    // For stages without visible tracks, find or auto-create a default "عام" track
    if (!trackId && stageId) {
      let def = await prisma.track.findFirst({ where: { stageId, name: 'عام' } });
      if (!def) def = await prisma.track.create({ data: { stageId, name: 'عام', order: 0 } });
      trackId = def.id;
    }
    if (!trackId) return res.status(400).json({ error: 'معرف المسار أو المرحلة مطلوب.' });
    const grade = await prisma.grade.create({ data: { trackId, name, order: Number(order) || 0 } });
    res.json(grade);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'هذا الصف موجود مسبقاً.' });
    res.status(500).json({ error: 'خطأ في إنشاء الصف.' });
  }
});

app.put('/api/grades/:id', authenticateToken, async (req, res) => {
  const { name, order } = req.body;
  try {
    const grade = await prisma.grade.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
    });
    res.json(grade);
  } catch { res.status(500).json({ error: 'خطأ في تحديث الصف.' }); }
});

app.delete('/api/grades/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.grade.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في حذف الصف.' }); }
});

// ── Semesters ──
app.post('/api/semesters', authenticateToken, async (req, res) => {
  const { gradeId, name, order } = req.body;
  if (!gradeId || !name) return res.status(400).json({ error: 'معرف الصف والاسم مطلوبان.' });
  try {
    const semester = await prisma.semester.create({
      data: { gradeId, name, order: Number(order) || 0 },
    });
    res.json(semester);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'هذا الفصل موجود مسبقاً.' });
    res.status(500).json({ error: 'خطأ في إنشاء الفصل.' });
  }
});

app.put('/api/semesters/:id', authenticateToken, async (req, res) => {
  const { name, order } = req.body;
  try {
    const semester = await prisma.semester.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(order !== undefined && { order: Number(order) }) },
    });
    res.json(semester);
  } catch { res.status(500).json({ error: 'خطأ في تحديث الفصل.' }); }
});

app.delete('/api/semesters/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.semester.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في حذف الفصل.' }); }
});

// ── All Subjects (management) ──
app.get('/api/all-subjects', authenticateToken, async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
    res.json(subjects);
  } catch { res.status(500).json({ error: 'خطأ في جلب المواد.' }); }
});

app.post('/api/all-subjects', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب.' });
  try {
    const subject = await prisma.subject.create({ data: { name } });
    res.json(subject);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'هذه المادة موجودة مسبقاً.' });
    res.status(500).json({ error: 'خطأ في إنشاء المادة.' });
  }
});

app.put('/api/all-subjects/:id', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const subject = await prisma.subject.update({ where: { id: req.params.id }, data: { name } });
    res.json(subject);
  } catch { res.status(500).json({ error: 'خطأ في تحديث المادة.' }); }
});

app.delete('/api/all-subjects/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في حذف المادة.' }); }
});


// -------------------- AUTO ADMIN SEED & SERVER SPINUP --------------------

async function seedAdminAndStart() {
  try {
    const adminEmail = 'admin@madrasati.sa';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
      console.log('Seeding default admin user...');
      const passwordHash = await bcrypt.hash('admin123456', 10);
      const user = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
        },
      });

      await prisma.admin.create({
        data: {
          userId: user.id,
          fullName: 'مدير النظام',
          email: adminEmail,
          permissions: ['ALL'],
        },
      });
      console.log('Admin user seeded: admin@madrasati.sa / admin123456');
    }

    app.listen(PORT, () => {
      console.log(`Admin backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

seedAdminAndStart();
