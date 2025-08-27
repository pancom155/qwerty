function authMiddleware(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function adminMiddleware(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  return res.redirect('/unauthorized');
}

module.exports = { authMiddleware, adminMiddleware };
