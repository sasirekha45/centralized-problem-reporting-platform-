const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- File Storage ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'evidence-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Database Connection ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345', // <--- CHECK YOUR PASSWORD
    database: 'sanitation_system'
});

db.connect(err => {
    if (err) console.error('DB Connection Failed:', err);
    else console.log('Connected to MySQL Database.');
});

// --- API ROUTES ---

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM supervisors WHERE username = ? AND password = ?', [username, password], (err, result) => {
        if (result.length > 0) return res.json({ success: true, user: result[0], role: 'supervisor' });
        db.query('SELECT * FROM residents WHERE username = ? AND password = ?', [username, password], (err, result) => {
            if (result.length > 0) {
                if (result[0].is_approved === 0) return res.json({ success: false, message: 'Account pending approval.' });
                return res.json({ success: true, user: result[0], role: 'resident' });
            }
            db.query('SELECT * FROM workers WHERE username = ? AND password = ?', [username, password], (err, result) => {
                if (result.length > 0) {
                    if (result[0].is_approved === 0) return res.json({ success: false, message: 'Account pending approval.' });
                    return res.json({ success: true, user: result[0], role: 'worker' });
                }
                res.json({ success: false, message: 'Invalid credentials' });
            });
        });
    });
});

// 2. Register
app.post('/api/register', (req, res) => {
    const { role, username, password, name, phone, email, address } = req.body;
    const table = role === 'resident' ? 'residents' : 'workers';
    const sql = `INSERT INTO ${table} (full_name, username, password, phone, email, address, is_approved) VALUES (?, ?, ?, ?, ?, ?, 0)`;
    db.query(sql, [name, username, password, phone, email, address], (err, result) => {
        if (err) return res.json({ success: false, message: 'Username likely taken.' });
        res.json({ success: true, message: 'Registration successful! Wait for approval.' });
    });
});

// 3. Approve User
app.post('/api/approve', (req, res) => {
    const { id, role } = req.body;
    const table = role === 'resident' ? 'residents' : 'workers';
    db.query(`UPDATE ${table} SET is_approved = 1 WHERE id = ?`, [id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, message: 'User Approved!' });
    });
});

// 4. Delete User
app.post('/api/delete-user', (req, res) => {
    const { id, role } = req.body;
    const table = role === 'resident' ? 'residents' : 'workers';
    db.query(`DELETE FROM ${table} WHERE id = ?`, [id], (err) => {
        if (err) return res.json({ success: false, message: 'Cannot delete user (might have active data).' });
        res.json({ success: true, message: 'User Removed.' });
    });
});

// 5. Create Request
app.post('/api/request', (req, res) => {
    const { residentId, type, description } = req.body;
    const sql = 'INSERT INTO requests (resident_id, type, description, status) VALUES (?, ?, ?, "Pending")';
    db.query(sql, [residentId, type, description], (err) => {
        res.json({ success: !err });
    });
});

// 6. Assign Worker
app.post('/api/assign', (req, res) => {
    const { requestId, workerId } = req.body;
    const sql = 'UPDATE requests SET assigned_worker_id = ?, status = "Assigned" WHERE id = ?';
    db.query(sql, [workerId, requestId], (err) => {
        res.json({ success: !err });
    });
});

// 7. NEW: Worker Marks Work Complete
app.post('/api/work-complete', (req, res) => {
    const { requestId } = req.body;
    const sql = 'UPDATE requests SET status = "Completed" WHERE id = ?';
    db.query(sql, [requestId], (err) => {
        if (err) return res.json({ success: false, message: "Error updating status" });
        res.json({ success: true });
    });
});

// 8. Submit Rating (Resident)
app.post('/api/rate', (req, res) => {
    const { requestId, rating, feedback } = req.body;
    // We update rating and feedback. Status remains "Completed".
    db.query('UPDATE requests SET rating = ?, feedback = ? WHERE id = ?', [rating, feedback, requestId], (err) => {
        res.json({ success: !err });
    });
});

// 9. Complaint
app.post('/api/complaint', upload.single('attachment'), (req, res) => {
    const { workerId, description } = req.body;
    const filename = req.file ? req.file.filename : null;
    db.query('INSERT INTO complaints (worker_id, description, attachment) VALUES (?, ?, ?)', [workerId, description, filename], (err) => {
        res.json({ success: !err });
    });
});

// 10. Fetch Data
app.get('/api/data', (req, res) => {
    const data = {};
    db.query('SELECT * FROM residents WHERE is_approved = 1', (err, r) => { data.residents = r;
    db.query('SELECT * FROM residents WHERE is_approved = 0', (err, pr) => { data.pendingResidents = pr;
    db.query('SELECT * FROM workers WHERE is_approved = 1', (err, w) => { data.workers = w;
    db.query('SELECT * FROM workers WHERE is_approved = 0', (err, pw) => { data.pendingWorkers = pw;
    db.query('SELECT * FROM requests', (err, reqs) => { data.requests = reqs;
    db.query('SELECT c.*, w.full_name as worker_name FROM complaints c JOIN workers w ON c.worker_id = w.id', (err, comps) => {
        data.complaints = comps || [];
        res.json(data);
    }); }); }); }); }); });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
    console.log('Open this link: http://localhost:3000/Home.html');
});