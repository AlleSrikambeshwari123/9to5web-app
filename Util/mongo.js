
const mongoose = require('mongoose');

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_HOST2 = process.env.MONGO_HOST2;
const MONGO_DBNAME = process.env.MONGO_DBNAME;
const MONGO_USERNAME = process.env.MONGO_USERNAME;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const MONGO_PORT = process.env.MONGO_PORT
const MONGO_PORT2 = process.env.MONGO_PORT2
const REPLICA_SET = process.env.REPLICA_SET
const MONGO_HOST3 = process.env.MONGO_HOST3;
const MONGO_PORT3 = process.env.MONGO_PORT3

let MONGO_URL;
if (MONGO_HOST === 'localhost') {
  MONGO_URL = `mongodb://${MONGO_HOST}:${MONGO_PORT},${MONGO_HOST2}:${MONGO_PORT2}/${MONGO_DBNAME}?replicaSet=${REPLICA_SET}&readPreference=nearest`;
   MONGO_URL = `mongodb://${MONGO_HOST}/${MONGO_DBNAME}`;
} else {
  MONGO_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT},${MONGO_HOST2}:${MONGO_PORT2},${MONGO_HOST3}:${MONGO_PORT3}/${MONGO_DBNAME}?replicaSet=${REPLICA_SET}&readPreference=nearest`;
}

const MONGOOSE_OPTIONS = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify:false,
  readPreference : 'nearest'
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