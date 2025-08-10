const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Setup DB connection
const db = mysql.createConnection({
  host: 'onepiecedb.mysql.database.azure.com',
  user: 'adminuser',
  password: 'root123!',
  database: 'one_piece_db',
  ssl: {
    ca: require('fs').readFileSync('./DigiCertGlobalRootCA.crt.pem')
  }
});

// Test database connection
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

// Serve static files
app.use(express.static(__dirname));

// Root endpoint to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Search endpoint
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  
  // Input validation
  if (query.length > 100) {
    return res.status(400).json({ error: 'Search query too long' });
  }
  
  db.query('SELECT * FROM characters WHERE name LIKE ?', [`%${query}%`], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.end(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
