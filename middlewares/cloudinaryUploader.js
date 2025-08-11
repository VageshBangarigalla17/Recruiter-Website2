// // backend/middlewares/cloudinaryUploader.js
// const multer = require('multer');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('../utils/cloudinary');

// // Profile images
// const avatarStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'hrms/avatars',
//     allowed_formats: ['jpg', 'png', 'jpeg'],
//     transformation: [{ width: 300, height: 300, crop: 'limit' }]
//   }
// });
// exports.avatarUploader = multer({ storage: avatarStorage });

// // Resumes (PDF, DOC)
// const resumeStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'hrms/resumes',
//     allowed_formats: ['pdf', 'doc', 'docx']
//   }
// });
// exports.resumeUploader = multer({ storage: resumeStorage });
