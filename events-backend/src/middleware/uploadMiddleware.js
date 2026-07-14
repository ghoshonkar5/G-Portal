const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const imageAndPdf = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const csv = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  if (imageAndPdf.includes(file.mimetype) || csv.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, PDF, and CSV files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;