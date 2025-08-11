// backend/middlewares/roleMiddleware.js

// Allow only Admins
exports.isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).render('403'); // or res.redirect('/dashboard')
};

// Allow only HR
exports.isHR = (req, res, next) => {
  if (req.user?.role === 'hr') {
    return next();
  }
  return res.status(403).render('403');
};

// Allow only Employees
exports.isEmployee = (req, res, next) => {
  if (req.user?.role === 'employee') {
    return next();
  }
  return res.status(403).render('403');
};
