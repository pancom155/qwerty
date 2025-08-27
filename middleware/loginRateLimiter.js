const COOLDOWN_MINUTES = 60;
const MAX_ATTEMPTS = 3;

const loginAttempts = {}; 

function loginRateLimiter(req, res, next) {
  const { email } = req.body;
  if (!email) return res.render('login', { error: 'Email is required.' });

  const now = new Date();

  if (!loginAttempts[email]) {
    loginAttempts[email] = { count: 0, lastAttempt: null };
  }

  const userAttempt = loginAttempts[email];

  if (
    userAttempt.count >= MAX_ATTEMPTS &&
    userAttempt.lastAttempt &&
    now - userAttempt.lastAttempt < COOLDOWN_MINUTES * 60 * 1000
  ) {
    const remainingMs = COOLDOWN_MINUTES * 60 * 1000 - (now - userAttempt.lastAttempt);
    const cooldownSeconds = Math.ceil(remainingMs / 1000);

    return res.render('login', {
      error: 'Too many failed attempts.',
      cooldownSeconds 
    });
  }

  req.loginAttempts = loginAttempts;
  next();
}

module.exports = loginRateLimiter;
