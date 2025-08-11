// backend/config/passport.js
const passport = require('passport');
const LocalStrategy  = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User          = require('../models/User');

module.exports = function() {
  // Local
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: 'Incorrect email.' });
        const ok = await user.comparePassword(password);
        if (!ok)   return done(null, false, { message: 'Wrong password.' });
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }
  ));

  // Google
  passport.use(new GoogleStrategy({
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          // Link by email if exists
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
          } else {
            user = new User({
              username: profile.displayName,
              email: profile.emails[0].value,
              password: Math.random().toString(36).slice(-8),
              googleId: profile.id
            });
          }
          await user.save();
        }
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (e) {
      done(e);
    }
  });
};
