import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';

// TODO: move values to env variables
const strategy = new OAuth2Strategy(
  {
    // state: true,
    authorizationURL: 'https://uat.hsesinfo.org/auth/oauth/authorize',
    tokenURL: 'https://uat.hsesinfo.org/auth/oauth/token',
    clientID: '7b9268101989e6ce7efc',
    clientSecret: 'ABHnjtF6iB1fsg940xBHvZy89Las7X31gywtsMChHrMV',
    callbackURL: 'http://localhost:3000/api/oauth2-client/login/oauth2/code/',
  },
  (accessToken, refreshToken, profile, cb) => {
    //User.findOrCreate({ exampleId: profile.id }, (err, user) => cb(err, user));
  },
);

strategy.userProfile = function (accessToken, done) {
  // access /user_info with accessToken
};

passport.use(strategy);

// Placeholder to add any auth logic
export default async function authMiddleware(req, res, next) {
  // Continue to the next middleware or ttdap
  next();
}
