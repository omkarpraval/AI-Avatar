const express = require('express');
const multer = require('multer');
const { parseDocuments } = require('../services/documentParser');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Allow larger PDFs for now (up to ~100MB per file)
    fileSize: 100 * 1024 * 1024,
    files: 5,
  },
});

router.post(
  '/upload',
  upload.array('files', 5),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const result = await parseDocuments(req.files);
      return res.json(result);
    } catch (err) {
      console.error('Upload error:', err);
      return res
        .status(500)
        .json({ error: 'Failed to parse documents on the server.' });
    }
  }
);

module.exports = router;

