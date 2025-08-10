# How to Add Images to Your One Piece App

## Method 1: Direct Database Insert (Recommended)

### Add a single character with image:
```javascript
const character = {
  name: 'Character Name',
  bounty: 'Bounty Amount',
  image_url: 'https://example.com/image.jpg'
};

db.query(
  'INSERT INTO characters (name, bounty, image_url) VALUES (?, ?, ?)',
  [character.name, character.bounty, character.image_url],
  (err, result) => {
    if (err) console.error('Error:', err);
    else console.log('Character added successfully!');
  }
);
```

### Update existing character with image:
```javascript
db.query(
  'UPDATE characters SET image_url = ? WHERE name LIKE ?',
  ['https://example.com/new-image.jpg', '%Character Name%'],
  (err, result) => {
    if (err) console.error('Error:', err);
    else console.log('Image updated successfully!');
  }
);
```

## Method 2: Using the add-character script

1. Edit `add-characters.js`
2. Add your character data to the `newCharacters` array
3. Run: `node add-characters.js`

## Method 3: Manual Database Query

If you have direct database access:
```sql
INSERT INTO characters (name, bounty, image_url) 
VALUES ('Character Name', 'Bounty Amount', 'https://image-url.com/image.jpg');
```

## Image URL Sources

### Good sources for One Piece character images:
- **One Piece Wiki**: `https://onepiece.fandom.com/`
- **Anime images**: Official anime screenshots
- **Placeholder services**: 
  - `https://via.placeholder.com/100x100/e67e22/ffffff?text=Name`
  - `https://ui-avatars.com/api/?name=Character+Name&size=100&background=e67e22&color=ffffff`

## Image Requirements

- **Size**: Recommended 100x100px or larger
- **Format**: JPG, PNG, GIF
- **URL**: Must be publicly accessible (HTTPS preferred)
- **Fallback**: App automatically handles broken images

## Testing Images

1. Start your server: `npm start`
2. Visit: `http://localhost:3000`
3. Search for any character name
4. Images should load automatically

## Current Database Structure

```
characters table:
- id (int, primary key)
- name (varchar)
- bounty (varchar)
- image_url (text)
```

## Example Characters Already in Database

Your database currently has 20 characters with images including:
- Monkey D. Luffy
- Roronoa Zoro
- Nami
- Sanji
- Tony Tony Chopper
- And many more!

Try searching for "Luffy" or "Zoro" to see the images in action!
