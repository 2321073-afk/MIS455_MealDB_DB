// Backend: Node.js + Express + MySQL
// Flow: Browser --(search)--> MealDB API  (first 5 results shown on page)
//       Browser --(save)----> server.js --Query--> MySQL DB
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

// ===== Database settings: fill in YOUR TiDB Cloud details here (only these lines) =====
const DB_CONFIG = {
  host: process.env.DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER || '2cy61DK9L25Y64d.root',
  password: process.env.DB_PASSWORD || '4DHCQd6RLseZizWm',
  database: process.env.DB_NAME || 'test'
};
if (DB_CONFIG.port === 4000 || process.env.DB_SSL === 'true') {
  DB_CONFIG.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
}
// ======================================================================================

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves public/index.html, style.css, script.js

const db = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 5 });

// Create the table automatically if it does not exist
async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS meals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meal_id VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(60),
      area VARCHAR(60),
      image VARCHAR(255),
      search_term VARCHAR(100),
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// READ: all meals saved in the database
app.get('/meals', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM meals ORDER BY id DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE: save the meals shown on the page (max 5)
app.post('/meals', async (req, res) => {
  const meals = Array.isArray(req.body.meals) ? req.body.meals.slice(0, 5) : [];
  const term = String(req.body.term || '').slice(0, 100);
  if (meals.length === 0) return res.status(400).json({ error: 'No meals to save' });
  try {
    for (const m of meals) {
      await db.query(
        `INSERT INTO meals (meal_id, name, category, area, image, search_term)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE search_term = VALUES(search_term)`,
        [String(m.id), String(m.name).slice(0, 150), String(m.category || '').slice(0, 60),
         String(m.area || '').slice(0, 60), String(m.image || '').slice(0, 255), term]
      );
    }
    res.status(201).json({ saved: meals.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE one saved meal
app.delete('/meals/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM meals WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Meal not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => {
    console.log('Database connected, table "meals" is ready');
    app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
  })
  .catch((err) => {
    console.log('Database connection FAILED:', err.code, '-', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') console.log('Hint: wrong user/password at the top of server.js.');
    if (err.code === 'ENOTFOUND') console.log('Hint: wrong host, or no internet.');
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') console.log('Hint: allow your IP in TiDB Cloud network settings, or cluster is paused.');
    process.exit(1);
  });
