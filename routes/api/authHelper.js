let passport = require('passport');
let JwtStrategy = require('passport-jwt').Strategy;
let ExtractJwt = require('passport-jwt').ExtractJwt;
var cryptojs = require('crypto-js');
var services = require('../../RedisServices/RedisDataServices')
const strings = require('../../Res/strings');

let options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: strings.user_auth_key,
}

passport.use(new JwtStrategy(options, function (payload, done) {
  console.log(payload)
  var bytes = cryptojs.AES.decrypt(payload.token, strings.user_auth_key);
  var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
  services.userService.getUser(tokenData.username).then(user => {
    if (user.id === undefined) return done(null, false);
    return done(null, user);
  }).catch(err => done(err, false));

}));
