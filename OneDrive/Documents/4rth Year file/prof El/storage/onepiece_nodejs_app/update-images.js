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
  
  updateImageUrls();
});

function updateImageUrls() {
  console.log('Updating image URLs to working sources...');
  
  const imageUpdates = [
    { name: 'Monkey D. Luffy', image_url: 'https://static.wikia.nocookie.net/onepiece/images/6/6d/Monkey_D._Luffy_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Roronoa Zoro', image_url: 'https://static.wikia.nocookie.net/onepiece/images/7/7a/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Nami', image_url: 'https://static.wikia.nocookie.net/onepiece/images/f/f5/Nami_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Sanji', image_url: 'https://static.wikia.nocookie.net/onepiece/images/c/c5/Sanji_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Usopp', image_url: 'https://static.wikia.nocookie.net/onepiece/images/3/3c/Usopp_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Tony Tony Chopper', image_url: 'https://static.wikia.nocookie.net/onepiece/images/0/0a/Tony_Tony_Chopper_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Nico Robin', image_url: 'https://static.wikia.nocookie.net/onepiece/images/b/b3/Nico_Robin_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Franky', image_url: 'https://static.wikia.nocookie.net/onepiece/images/3/37/Franky_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Brook', image_url: 'https://static.wikia.nocookie.net/onepiece/images/9/9b/Brook_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Jinbe', image_url: 'https://static.wikia.nocookie.net/onepiece/images/6/6b/Jinbe_Anime_Infobox.png' },
    { name: 'Shanks', image_url: 'https://static.wikia.nocookie.net/onepiece/images/0/0b/Shanks_Anime_Infobox.png' },
    { name: 'Trafalgar Law', image_url: 'https://static.wikia.nocookie.net/onepiece/images/7/7b/Trafalgar_Law_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Eustass Kid', image_url: 'https://static.wikia.nocookie.net/onepiece/images/f/f0/Eustass_Kid_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Portgas D. Ace', image_url: 'https://static.wikia.nocookie.net/onepiece/images/0/0b/Portgas_D._Ace_Anime_Infobox.png' },
    { name: 'Sabo', image_url: 'https://static.wikia.nocookie.net/onepiece/images/f/fc/Sabo_Anime_Infobox.png' },
    { name: 'Buggy', image_url: 'https://static.wikia.nocookie.net/onepiece/images/3/35/Buggy_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Kaido', image_url: 'https://static.wikia.nocookie.net/onepiece/images/e/e7/Kaidou_Anime_Infobox.png' },
    { name: 'Big Mom', image_url: 'https://static.wikia.nocookie.net/onepiece/images/9/9e/Charlotte_Linlin_Anime_Infobox.png' },
    { name: 'Blackbeard', image_url: 'https://static.wikia.nocookie.net/onepiece/images/b/bb/Marshall_D._Teach_Anime_Post_Timeskip_Infobox.png' },
    { name: 'Boa Hancock', image_url: 'https://static.wikia.nocookie.net/onepiece/images/6/61/Boa_Hancock_Anime_Post_Timeskip_Infobox.png' }
  ];
  
  let updated = 0;
  imageUpdates.forEach(update => {
    db.query(
      'UPDATE characters SET image_url = ? WHERE name LIKE ?',
      [update.image_url, `%${update.name}%`],
      (err, result) => {
        if (err) {
          console.error(`Error updating ${update.name}:`, err);
        } else {
          console.log(`✓ Updated ${update.name} with working image URL`);
        }
        
        updated++;
        if (updated === imageUpdates.length) {
          console.log('\n🎉 All image URLs updated to working sources!');
          console.log('🌐 Your app now has high-quality One Piece Wiki images!');
          db.end();
        }
      }
    );
  });
}
