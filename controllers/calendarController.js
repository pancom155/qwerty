const BlockedDate = require('../models/BlockedDate');

exports.blockDate = async (req, res) => {
  try {
    const { date, reason } = req.body;

    const existing = await BlockedDate.findOne({ date });
    if (existing) return res.status(400).json({ message: 'Date already blocked' });

    const newBlock = new BlockedDate({ date, reason });
    await newBlock.save();

    res.status(200).json({ message: 'Date blocked successfully', blockedDate: newBlock });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unblockDate = async (req, res) => {
  try {
    const { date } = req.body;
    await BlockedDate.deleteOne({ date });
    res.status(200).json({ message: 'Date unblocked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBlockedDates = async (req, res) => {
  try {
    const blocked = await BlockedDate.find().select('date -_id');
    res.json(blocked.map(d => d.date));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
