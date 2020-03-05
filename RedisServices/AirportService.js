const strings = require('../Res/strings');
const CRUDService = require('./CRUDService');

const PREFIX = strings.redis_prefix_airport;
const AIRPORT_ID_KEY = strings.redis_id_airport;

class AirportService extends CRUDService {
  constructor() {
    super({
      prefix: PREFIX,
      idKey: AIRPORT_ID_KEY,
    });
  }
}

module.exports = AirportService;
