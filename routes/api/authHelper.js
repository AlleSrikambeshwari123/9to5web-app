let passport = require('passport');
let JwtStrategy = require('passport-jwt').Strategy;
let ExtractJwt = require('passport-jwt').ExtractJwt;
var cryptojs = require('crypto-js');
const strings = require('../../Res/strings');

let options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
}

passport.use(new JwtStrategy(options, function (payload, done) {
  var bytes = cryptojs.AES.decrypt(payload.token, strings.user_auth_key);
  var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
  console.log(tokenData);

  customerService.getCustomer(tokenData.platformId, tokenData.mobile)
    .then((user) => {
      if (user.id === undefined) return done(null, false);
      return done(null, user);
    })
    .catch(err => done(err, false));
}));
