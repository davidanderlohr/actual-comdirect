const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importCsvToActual } = require('./logic.js');
const bodyParser = require('body-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('csvfile'), async (req, res) => {
  try {
    const csvPath = req.file.path;
    const password = req.body.password || undefined;
    await importCsvToActual(csvPath, password);
    fs.unlinkSync(csvPath); // Clean up uploaded file
    res.send('Import successful!');
  } catch (err) {
    res.status(500).send('Import failed: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web UI server running at http://localhost:${PORT}`);
});
