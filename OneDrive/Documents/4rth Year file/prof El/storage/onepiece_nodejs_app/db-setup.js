const mysql = require('mysql2');
const fs = require('fs');

// Database connection
const db = mysql.createConnection({
  host: 'onepiecedb.mysql.database.azure.com',
  user: 'adminuser',
  password: 'root123!',
  database: 'one_piece_db',
  ssl: {
    ca: fs.readFileSync('./DigiCertGlobalRootCA.crt.pem')
  }
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  
  // Check current table structure
  checkTableStructure();
});

function checkTableStructure() {
  console.log('\n--- Checking table structure ---');
  db.query('DESCRIBE characters', (err, results) => {
    if (err) {
      console.error('Error describing table:', err);
      createTable();
      return;
    }
    
    console.log('Current table structure:');
    results.forEach(column => {
      console.log(`${column.Field}: ${column.Type} ${column.Null} ${column.Key} ${column.Default}`);
    });
    
    // Check if image_url column exists
    const hasImageUrl = results.some(column => column.Field === 'image_url');
    
    if (!hasImageUrl) {
      console.log('\n--- Adding image_url column ---');
      addImageUrlColumn();
    } else {
      console.log('\n--- image_url column already exists ---');
      showSampleData();
    }
  });
}

function createTable() {
  console.log('\n--- Creating characters table ---');
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS characters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      bounty VARCHAR(255),
      crew VARCHAR(255),
      devil_fruit VARCHAR(255),
      image_url TEXT
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Characters table created successfully');
      insertSampleData();
    }
  });
}

function addImageUrlColumn() {
  db.query('ALTER TABLE characters ADD COLUMN image_url TEXT', (err) => {
    if (err) {
      console.error('Error adding image_url column:', err);
    } else {
      console.log('image_url column added successfully');
      updateExistingDataWithImages();
    }
  });
}

function updateExistingDataWithImages() {
  console.log('\n--- Updating existing data with image URLs ---');
  
  const imageUpdates = [
    { name: 'Luffy', image_url: 'https://static.wikia.nocookie.net/onepiece/images/6/6d/Monkey_D._Luffy_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Zoro', image_url: 'https://static.wikia.nocookie.net/onepiece/images/7/7a/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Nami', image_url: 'https://static.wikia.nocookie.net/onepiece/images/f/f5/Nami_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Sanji', image_url: 'https://static.wikia.nocookie.net/onepiece/images/c/c5/Sanji_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Usopp', image_url: 'https://static.wikia.nocookie.net/onepiece/images/3/3c/Usopp_Anime_Post_Timeskip_Infobox.png' }
  ];
  
  imageUpdates.forEach(update => {
    db.query(
      'UPDATE characters SET image_url = ? WHERE name LIKE ?',
      [update.image_url, `%${update.name}%`],
      (err, result) => {
        if (err) {
          console.error(`Error updating ${update.name}:`, err);
        } else {
          console.log(`Updated ${update.name} with image URL (affected rows: ${result.affectedRows})`);
        }
      }
    );
  });
  
  setTimeout(() => {
    showSampleData();
  }, 2000);
}

function insertSampleData() {
  console.log('\n--- Inserting sample data ---');
  
  const sampleCharacters = [
    {
      name: 'Monkey D. Luffy',
      bounty: '3,000,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: 'Gomu Gomu no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/6/6d/Monkey_D._Luffy_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Roronoa Zoro',
      bounty: '1,111,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: null,
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/7/7a/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Nami',
      bounty: '366,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: null,
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/f/f5/Nami_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Usopp',
      bounty: '500,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: null,
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/3/3c/Usopp_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Sanji',
      bounty: '1,032,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: null,
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/c/c5/Sanji_Anime_Post_Timeskip_Infobox.png'
    }
  ];
  
  sampleCharacters.forEach(character => {
    db.query(
      'INSERT INTO characters (name, bounty, crew, devil_fruit, image_url) VALUES (?, ?, ?, ?, ?)',
      [character.name, character.bounty, character.crew, character.devil_fruit, character.image_url],
      (err, result) => {
        if (err) {
          console.error(`Error inserting ${character.name}:`, err);
        } else {
          console.log(`Inserted ${character.name} successfully`);
        }
      }
    );
  });
  
  setTimeout(() => {
    showSampleData();
  }, 2000);
}

function showSampleData() {
  console.log('\n--- Current data in characters table ---');
  db.query('SELECT * FROM characters LIMIT 5', (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
    } else {
      console.log('Sample characters:');
      results.forEach(character => {
        console.log(`- ${character.name} (${character.bounty || 'No bounty'}) - Image: ${character.image_url ? 'Yes' : 'No'}`);
      });
    }
    
    console.log('\n--- Database setup complete ---');
    db.end();
  });
}
