import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('attendance.db');
const JWT_SECRET = 'ams-secret-key-2026';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'faculty', 'student')),
    full_name TEXT,
    dob TEXT
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    code TEXT UNIQUE,
    semester INTEGER DEFAULT 1,
    type TEXT CHECK(type IN ('theory', 'practical')) DEFAULT 'theory',
    credits INTEGER DEFAULT 3
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    roll_number TEXT UNIQUE,
    branch TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    department TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    date TEXT,
    status TEXT CHECK(status IN ('present', 'absent')),
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    UNIQUE(student_id, subject_id, date)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    file_url TEXT,
    subject_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    type TEXT CHECK(type IN ('exam', 'deadline', 'event', 'general')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    semester INTEGER,
    session TEXT,
    sgpa REAL,
    cgpa REAL,
    FOREIGN KEY(student_id) REFERENCES students(id),
    UNIQUE(student_id, semester, session)
  );

  CREATE TABLE IF NOT EXISTS subject_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER,
    subject_id INTEGER,
    grade TEXT,
    grade_point INTEGER,
    FOREIGN KEY(result_id) REFERENCES results(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    UNIQUE(result_id, subject_id)
  );
`);

// Migration: Add branch column to students if it doesn't exist
try {
  db.prepare('ALTER TABLE students ADD COLUMN branch TEXT').run();
} catch (e) {
  // Column might already exist
}

// Migration: Remove class column from students if it exists
try {
  db.prepare('ALTER TABLE students DROP COLUMN class').run();
} catch (e) {
  // Column might not exist or DROP COLUMN not supported
}

// Migration: Add semester, type, credits to subjects if they don't exist
try {
  db.prepare('ALTER TABLE subjects ADD COLUMN semester INTEGER DEFAULT 1').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE subjects ADD COLUMN type TEXT CHECK(type IN ("theory", "practical")) DEFAULT "theory"').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE subjects ADD COLUMN credits INTEGER DEFAULT 3').run();
} catch (e) {}

// Seed Admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role, full_name, dob) VALUES (?, ?, ?, ?, ?)').run('admin', hashedPassword, 'admin', 'System Administrator', '1980-01-01');
}

// Seed a Faculty if not exists
const facultyExists = db.prepare('SELECT * FROM users WHERE role = ?').get('faculty');
if (!facultyExists) {
  const hashedPassword = bcrypt.hashSync('faculty123', 10);
  const userResult = db.prepare('INSERT INTO users (username, password, role, full_name, dob) VALUES (?, ?, ?, ?, ?)').run('faculty01', hashedPassword, 'faculty', 'Dr. Smith', '1985-05-15');
  db.prepare('INSERT INTO faculty (user_id, department) VALUES (?, ?)').run(userResult.lastInsertRowid, 'Computer Science');
}

// Seed a Student if not exists
// Seed specific students if not exists
const requestedStudents = [];

requestedStudents.forEach(s => {
  const exists = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(s.regNo);
  if (!exists) {
    const hashedPassword = bcrypt.hashSync('student123', 10);
    const userResult = db.prepare('INSERT INTO users (username, password, role, full_name, dob) VALUES (?, ?, ?, ?, ?)').run(s.regNo, hashedPassword, 'student', s.name, '2005-01-01');
    db.prepare('INSERT INTO students (user_id, roll_number, branch) VALUES (?, ?, ?)').run(userResult.lastInsertRowid, s.regNo, 'Computer Science');
  }
});

// Delete specific students if they exist as requested
const studentsToDelete = ['2301114144', '2301114042', '2301114147'];
studentsToDelete.forEach(rollNo => {
  const student = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(rollNo) as any;
  if (student) {
    db.transaction(() => {
      db.prepare('DELETE FROM attendance WHERE student_id = ?').run(student.id);
      db.prepare('DELETE FROM results WHERE student_id = ?').run(student.id);
      db.prepare('DELETE FROM students WHERE id = ?').run(student.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(student.user_id);
    })();
  }
});

// Seed Gigi if not exists
const gigiExists = db.prepare('SELECT * FROM students WHERE roll_number = ?').get('Gigi');
if (!gigiExists) {
  const hashedPassword = bcrypt.hashSync('gigi29', 10);
  const userResult = db.prepare('INSERT INTO users (username, password, role, full_name, dob) VALUES (?, ?, ?, ?, ?)').run('Gigi', hashedPassword, 'student', 'Gigi', '2005-01-01');
  db.prepare('INSERT INTO students (user_id, roll_number, branch) VALUES (?, ?, ?)').run(userResult.lastInsertRowid, 'Gigi', 'Computer Science');
}

const studentExists = db.prepare('SELECT * FROM users WHERE role = ?').get('student');
if (!studentExists) {
  const hashedPassword = bcrypt.hashSync('student123', 10);
  const userResult = db.prepare('INSERT INTO users (username, password, role, full_name, dob) VALUES (?, ?, ?, ?, ?)').run('student01', hashedPassword, 'student', 'John Doe', '2005-01-01');
  db.prepare('INSERT INTO students (user_id, roll_number, branch) VALUES (?, ?, ?)').run(userResult.lastInsertRowid, 'S101', 'Computer Science');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      
      let studentInfo = null;
      if (user.role === 'student') {
        studentInfo = db.prepare('SELECT * FROM students WHERE user_id = ?').get(user.id);
      }
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          full_name: user.full_name,
          dob: user.dob,
          student_id: studentInfo?.id
        } 
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  app.post('/api/verify-reset', (req, res) => {
    const { username, dob } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (user && user.dob === dob) {
      const resetToken = jwt.sign({ id: user.id, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '15m' });
      res.json({ resetToken });
    } else {
      res.status(401).json({ message: 'Verification failed. Please check your username and date of birth.' });
    }
  });

  app.post('/api/reset-password', (req, res) => {
    const { resetToken, newPassword } = req.body;
    try {
      const decoded = jwt.verify(resetToken, JWT_SECRET) as any;
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, decoded.id);
      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
    }
  });

  // Subjects
  app.get('/api/subjects', authenticateToken, (req: any, res) => {
    const subjects = db.prepare('SELECT * FROM subjects').all();
    res.json(subjects);
  });

  app.post('/api/subjects', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, code, semester, type, credits } = req.body;
    try {
      db.prepare('INSERT INTO subjects (name, code, semester, type, credits) VALUES (?, ?, ?, ?, ?)').run(name, code, semester, type, credits);
      res.status(201).json({ message: 'Subject added' });
    } catch (e) {
      res.status(400).json({ message: 'Subject already exists' });
    }
  });

  app.delete('/api/subjects/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Subject deleted' });
  });

  // Students
  app.get('/api/students', authenticateToken, (req: any, res) => {
    const students = db.prepare(`
      SELECT s.*, u.username, u.full_name 
      FROM students s 
      JOIN users u ON s.user_id = u.id
    `).all();
    res.json(students);
  });

  app.post('/api/students', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { username, password, full_name, roll_number, branch, dob } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const transaction = db.transaction(() => {
      const userResult = db.prepare('INSERT INTO users (username, password, role, full_name, dob) VALUES (?, ?, ?, ?, ?)').run(username, hashedPassword, 'student', full_name, dob);
      db.prepare('INSERT INTO students (user_id, roll_number, branch) VALUES (?, ?, ?)').run(userResult.lastInsertRowid, roll_number, branch);
    });

    try {
      transaction();
      res.status(201).json({ message: 'Student added' });
    } catch (e) {
      res.status(400).json({ message: 'Username or Roll Number already exists' });
    }
  });

  app.delete('/api/students/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const student = db.prepare('SELECT user_id FROM students WHERE id = ?').get(req.params.id) as any;
    if (student) {
      try {
        const transaction = db.transaction(() => {
          // Delete subject_results first as they reference results
          const studentResults = db.prepare('SELECT id FROM results WHERE student_id = ?').all(req.params.id) as any[];
          const resultIds = studentResults.map(r => r.id);
          
          if (resultIds.length > 0) {
            const placeholders = resultIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM subject_results WHERE result_id IN (${placeholders})`).run(...resultIds);
            db.prepare(`DELETE FROM results WHERE student_id = ?`).run(req.params.id);
          }
          
          db.prepare('DELETE FROM attendance WHERE student_id = ?').run(req.params.id);
          db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
          db.prepare('DELETE FROM users WHERE id = ?').run(student.user_id);
        });
        transaction();
        res.json({ message: 'Student deleted' });
      } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ message: 'Failed to delete student. They may have related records that cannot be removed.' });
      }
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  });

  // Attendance
  app.post('/api/attendance', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.sendStatus(403);
    const { records, date, subject_id } = req.body; // records: [{student_id, status}]
    
    if (!records || !Array.isArray(records) || !date || !subject_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      const insert = db.prepare('INSERT OR REPLACE INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)');
      const transaction = db.transaction((recs) => {
        for (const rec of recs) {
          insert.run(rec.student_id, parseInt(subject_id), date, rec.status);
        }
      });
      
      transaction(records);
      res.json({ message: 'Attendance marked successfully' });
    } catch (error: any) {
      console.error('Attendance submission error:', error);
      res.status(500).json({ message: 'Failed to submit attendance', error: error.message });
    }
  });

  app.get('/api/attendance/student/:id', authenticateToken, (req: any, res) => {
    const records = db.prepare(`
      SELECT a.*, sub.name as subject_name, sub.code as subject_code
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
    `).all(req.params.id);
    res.json(records);
  });

  // Assignments
  app.get('/api/assignments', authenticateToken, (req: any, res) => {
    const assignments = db.prepare(`
      SELECT a.*, s.name as subject_name 
      FROM assignments a 
      JOIN subjects s ON a.subject_id = s.id
      ORDER BY a.created_at DESC
    `).all();
    res.json(assignments);
  });

  app.post('/api/assignments', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { title, description, file_url, subject_id } = req.body;
    db.prepare('INSERT INTO assignments (title, description, file_url, subject_id) VALUES (?, ?, ?, ?)').run(title, description, file_url, subject_id);
    res.status(201).json({ message: 'Assignment uploaded' });
  });

  app.delete('/api/assignments/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Assignment deleted' });
  });

  // Notifications
  app.get('/api/notifications', authenticateToken, (req: any, res) => {
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all();
    res.json(notifications);
  });

  app.post('/api/notifications', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { title, message, type } = req.body;
    db.prepare('INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)').run(title, message, type);
    res.status(201).json({ message: 'Notification created' });
  });

  // Results
  app.get('/api/results/student/:id', authenticateToken, (req: any, res) => {
    const results = db.prepare(`
      SELECT r.*, 
             (SELECT json_group_array(json_object(
               'subject_id', sr.subject_id,
               'subject_code', s.code,
               'subject_name', s.name,
               'grade', sr.grade,
               'grade_point', sr.grade_point,
               'credits', s.credits,
               'type', s.type
             ))
              FROM subject_results sr
              JOIN subjects s ON sr.subject_id = s.id
              WHERE sr.result_id = r.id) as subject_results
      FROM results r
      WHERE r.student_id = ?
    `).all(req.params.id);
    
    res.json(results.map((r: any) => ({
      ...r,
      subject_results: JSON.parse(r.subject_results)
    })));
  });

  app.delete('/api/notifications/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ message: 'Notification deleted' });
  });

  // Results
  app.post('/api/student/results', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'student') return res.sendStatus(403);
    const { dob, rollNo, session } = req.body;
    
    const user = db.prepare('SELECT dob FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user || user.dob !== dob) {
      return res.status(401).json({ error: 'Date of Birth verification failed' });
    }

    const student = db.prepare(`
      SELECT s.*, u.full_name, u.dob 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.user_id = ?
    `).get(req.user.id) as any;
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    if (student.roll_number !== rollNo) {
      return res.status(401).json({ error: 'Roll Number verification failed' });
    }

    const results = db.prepare(`
      SELECT r.*, 
             (SELECT json_group_array(json_object(
               'subject_id', sr.subject_id,
               'subject_code', s.code,
               'subject_name', s.name,
               'grade', sr.grade,
               'grade_point', sr.grade_point,
               'credits', s.credits,
               'type', s.type
             ))
              FROM subject_results sr
              JOIN subjects s ON sr.subject_id = s.id
              WHERE sr.result_id = r.id) as subject_results
      FROM results r
      WHERE r.student_id = ? AND r.session = ?
      ORDER BY r.semester ASC
    `).all(student.id, session);
    
    res.json({
      student,
      results: results.map((r: any) => ({
        ...r,
        subject_results: JSON.parse(r.subject_results)
      }))
    });
  });

  app.post('/api/results', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { student_id, semester, session, sgpa, cgpa, subject_results } = req.body;
    
    const transaction = db.transaction(() => {
      // Upsert main result
      const existing = db.prepare('SELECT id FROM results WHERE student_id = ? AND semester = ? AND session = ?').get(student_id, semester, session) as any;
      let resultId;
      if (existing) {
        resultId = existing.id;
        db.prepare('UPDATE results SET sgpa = ?, cgpa = ? WHERE id = ?').run(sgpa, cgpa, resultId);
      } else {
        const info = db.prepare('INSERT INTO results (student_id, semester, session, sgpa, cgpa) VALUES (?, ?, ?, ?, ?)').run(student_id, semester, session, sgpa, cgpa);
        resultId = info.lastInsertRowid;
      }

      // Update subject results
      if (subject_results && Array.isArray(subject_results)) {
        for (const sr of subject_results) {
          db.prepare(`
            INSERT INTO subject_results (result_id, subject_id, grade, grade_point)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(result_id, subject_id) DO UPDATE SET
            grade = excluded.grade,
            grade_point = excluded.grade_point
          `).run(resultId, sr.subject_id, sr.grade, sr.grade_point);
        }
      }
      return resultId;
    });

    try {
      transaction();
      res.status(201).json({ message: 'Result updated' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to update result' });
    }
  });

  app.get('/api/attendance/report', authenticateToken, (req: any, res) => {
    const { subject_id, date, search, status } = req.query;
    let query = `
      SELECT a.*, s.roll_number, s.branch, u.full_name, sub.name as subject_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (subject_id) {
      query += ' AND a.subject_id = ?';
      params.push(subject_id);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR s.roll_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const report = db.prepare(query).all(...params);
    res.json(report);
  });

  app.get('/api/student/dashboard', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'student') return res.sendStatus(403);
    
    const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id) as any;
    if (!student) return res.status(404).json({ message: 'Student record not found' });

    const attendance = db.prepare(`
      SELECT a.*, s.name as subject_name
      FROM attendance a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
      LIMIT 10
    `).all(student.id);

    const stats = db.prepare(`
      SELECT 
        s.name as subject_name,
        s.id as subject_id,
        COUNT(a.id) as total_classes,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count
      FROM subjects s
      LEFT JOIN attendance a ON s.id = a.subject_id AND a.student_id = ?
      GROUP BY s.id
    `).all(student.id);

    const assignments = db.prepare(`
      SELECT a.*, s.name as subject_name 
      FROM assignments a 
      JOIN subjects s ON a.subject_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `).all();

    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5').all();

    res.json({ student, attendance, stats, assignments, notifications });
  });

  // Admin Dashboard Stats
  app.get('/api/admin/stats', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get() as any;
    const totalSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects').get() as any;
    const todayAttendance = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = date('now')").get() as any;
    
    const recentAttendance = db.prepare(`
      SELECT a.date, COUNT(*) as count, 
             SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present
      FROM attendance a
      GROUP BY a.date
      ORDER BY a.date DESC
      LIMIT 7
    `).all();

    res.json({
      totalStudents: totalStudents.count,
      totalSubjects: totalSubjects.count,
      todayAttendance: todayAttendance.count,
      recentAttendance
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
