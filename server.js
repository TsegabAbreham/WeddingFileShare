// server.js (no login version)
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const { PassThrough } = require('stream');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

// Google Drive auth
const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/drive']
);
const drive = google.drive({ version: 'v3', auth });

// List files
app.get('/api/files', async (req, res) => {
  try {
    const list = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id,name,createdTime,mimeType)'
    });
    res.json({ success: true, files: list.data.files });
  } catch (error) {
    console.error('Drive list error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Missing file' });

  const stream = new PassThrough();
  stream.end(file.buffer);

  try {
    await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [FOLDER_ID]
      },
      media: {
        mimeType: file.mimetype,
        body: stream
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Drive upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
  const fileId = req.params.id;
  const { password } = req.body;

  if (password !== process.env.DELETE_PASSWORD) {
    return res.status(403).json({ error: 'Wrong password' });
  }

  try {
    await drive.files.delete({ fileId });
    res.json({ success: true });
  } catch (error) {
    console.error('Drive delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
