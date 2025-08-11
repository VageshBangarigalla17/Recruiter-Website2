function isAdmin(req, res, next) {
  // Allow access if user is authenticated and role is 'Admin'
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
    return next();
  }
  // Optionally, allow HR as well:
  // if (req.user && req.user.role && ['admin', 'hr'].includes(req.user.role.toLowerCase())) {
  //   return next();
  // }
  res.status(403).render('403', { message: 'Forbidden – Admins only' });
}

module.exports = { isAdmin };