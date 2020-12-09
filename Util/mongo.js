
const mongoose = require('mongoose');

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_DBNAME = process.env.MONGO_DBNAME;
const MONGO_USERNAME = process.env.MONGO_USERNAME;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;

let MONGO_URL;
if (MONGO_HOST === 'localhost') {
  MONGO_URL = `mongodb://${MONGO_HOST}:50001,${MONGO_HOST}:50002,${MONGO_HOST}:50003/${MONGO_DBNAME}?replicaSet=d&readPreference=secondaryPreferred`;
  // MONGO_URL = `mongodb://${MONGO_HOST}/${MONGO_DBNAME}`;
} else {
  MONGO_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}/${MONGO_DBNAME}`;
}

const MONGOOSE_OPTIONS = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify:false,
  readPreference : 'secondaryPreferred'
};

const connectMongo = (cb) => {
  mongoose.connect(MONGO_URL, MONGOOSE_OPTIONS, (error) => {
    if (error) {
      console.log("MONGO ERROR : " + error);
      console.log('Reconnecting in 1500ms...');
      setTimeout(() => connectMongo(cb), 1500);
    } else {
      console.log('Connected to mongoDB...', process.env.MONGO_HOST);
      cb(null);
    }
  })
}

const createConnection = () => {
  return new Promise((resolve, reject) => {
    connectMongo((err, response) => {
      if (!err) {
        resolve();
      }
    })
  })
};

module.exports = createConnection;
