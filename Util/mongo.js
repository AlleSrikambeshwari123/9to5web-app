
const mongoose = require('mongoose');

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_DBNAME = process.env.MONGO_DBNAME;
const MONGO_USERNAME = process.env.MONGO_USERNAME;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;

const MONGO_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}/${MONGO_DBNAME}`;

const MONGOOSE_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

const createConnection = () => {
  return mongoose.connect(MONGO_URL, MONGOOSE_OPTIONS, (error) => {
    if (error) {
      console.log("MONGO ERROR : " + error);
      console.log('Reconnecting in 1500ms...');
      setTimeout(() => createConnection(), 1500);
    } else {
      console.log('Connected to mongoDB...');
    }
  })
};

module.exports = createConnection;
