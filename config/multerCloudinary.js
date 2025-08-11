// backend/config/multerCloudinary.js

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Make sure this exports configured cloudinary

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const fileType = file.fieldname; // 'resume' or 'avatar'

    const folder = fileType === 'resume' ? 'resumes' : 'avatars';
    const resource_type = fileType === 'resume' ? 'raw' : 'image';
    const extension = file.originalname.split('.').pop();
    const filenameWithoutExt = file.originalname.split('.')[0];

    return {
      folder,
      resource_type,
      format: extension, // preserve the original format (e.g. pdf, jpg)
      public_id: `${Date.now()}-${filenameWithoutExt}` // unique file name
    };
  }
});

// Multer middleware using Cloudinary storage
const upload = multer({ storage });

module.exports = upload;
