const passport = require('passport');

// Authentication middleware
const auth = passport.authenticate('jwt', { session: false });

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Tài khoản ${req.user ? req.user.role : 'khách'} không có quyền thực hiện hành động này.` 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
