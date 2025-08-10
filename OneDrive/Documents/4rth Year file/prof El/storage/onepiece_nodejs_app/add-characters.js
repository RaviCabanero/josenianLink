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

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  
  addMoreCharactersWithImages();
});

function addMoreCharactersWithImages() {
  console.log('Adding more One Piece characters with images...');
  
  const newCharacters = [
    {
      name: 'Tony Tony Chopper',
      bounty: '1,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: 'Hito Hito no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/0/0a/Tony_Tony_Chopper_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Nico Robin',
      bounty: '930,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: 'Hana Hana no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/b/b3/Nico_Robin_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Franky',
      bounty: '394,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: null,
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/3/37/Franky_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Brook',
      bounty: '383,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: 'Yomi Yomi no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/9/9b/Brook_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Jinbe',
      bounty: '1,100,000,000 Berries',
      crew: 'Straw Hat Pirates',
      devil_fruit: null,
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/6/6b/Jinbe_Anime_Infobox.png'
    },
    {
      name: 'Trafalgar D. Water Law',
      bounty: '3,000,000,000 Berries',
      crew: 'Heart Pirates',
      devil_fruit: 'Ope Ope no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/7/7b/Trafalgar_Law_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Eustass Kid',
      bounty: '3,000,000,000 Berries',
      crew: 'Kid Pirates',
      devil_fruit: 'Jiki Jiki no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/f/f0/Eustass_Kid_Anime_Post_Timeskip_Infobox.png'
    },
    {
      name: 'Portgas D. Ace',
      bounty: '550,000,000 Berries',
      crew: 'Whitebeard Pirates',
      devil_fruit: 'Mera Mera no Mi',
      image_url: 'https://static.wikia.nocookie.net/onepiece/images/0/0b/Portgas_D._Ace_Anime_Infobox.png'
    }
  ];
  
  let inserted = 0;
  newCharacters.forEach((character, index) => {
    // Check if character already exists
    db.query('SELECT id FROM characters WHERE name = ?', [character.name], (err, results) => {
      if (err) {
        console.error(`Error checking ${character.name}:`, err);
        return;
      }
      
      if (results.length > 0) {
        console.log(`${character.name} already exists, skipping...`);
      } else {
        // Insert new character
        db.query(
          'INSERT INTO characters (name, bounty, crew, devil_fruit, image_url) VALUES (?, ?, ?, ?, ?)',
          [character.name, character.bounty, character.crew, character.devil_fruit, character.image_url],
          (err, result) => {
            if (err) {
              console.error(`Error inserting ${character.name}:`, err);
            } else {
              console.log(`✓ Added ${character.name} with image`);
            }
            
            inserted++;
            if (inserted === newCharacters.length) {
              showAllCharacters();
            }
          }
        );
      }
      
      inserted++;
      if (inserted === newCharacters.length) {
        setTimeout(showAllCharacters, 1000);
      }
    });
  });
}

function showAllCharacters() {
  console.log('\n--- All characters in database ---');
  db.query('SELECT name, bounty, image_url FROM characters ORDER BY name', (err, results) => {
    if (err) {
      console.error('Error fetching all characters:', err);
    } else {
      console.log(`Total characters: ${results.length}`);
      results.forEach(character => {
        const hasImage = character.image_url ? '🖼️' : '❌';
        console.log(`${hasImage} ${character.name} - ${character.bounty || 'No bounty'}`);
      });
    }
    
    console.log('\n✅ Database update complete! Your app now has images for all characters.');
    console.log('🌐 Visit http://localhost:3000 and search for any character name to see the images!');
    db.end();
  });
}
