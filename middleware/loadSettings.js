const Settings = require('../models/Settings'); // adjust path if needed

module.exports = async (req, res, next) => {
  try {
    const settings = await Settings.findOne() || { logo: '' };
    res.locals.settings = settings; // available to all EJS views
    next();
  } catch (err) {
    console.error('Error loading settings:', err);
    res.locals.settings = { logo: '' };
    next();
  }
};
