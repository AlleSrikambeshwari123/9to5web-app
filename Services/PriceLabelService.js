const strings = require('../Res/strings');
const PriceLabel = require('../models/pricelabel');
const Package = require('../models/package');

class PriceLabelService {
  getPriceLabels() {
    return new Promise((resolve, reject) => {
      PriceLabel.find()
      .populate('packages')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
            console.log(result)
          resolve(result);
        }
      })
    })
  }

  addPriceLabel(priceLabel) {
    return new Promise((resolve, reject) => {
      const newPriceLabelData = new PriceLabel(priceLabel);
      newPriceLabelData.save((err, result) => {
        if (err) {
          console.error(err);  
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    });
  }
  getPriceLabel(id) {
    return new Promise((resolve, reject) => {
      PriceLabel.findOne({packageId: id})
      .populate({
        path:'packageId',
        populate:{
            path:'awbId',
            populate:{
                path:'invoices'
            }
        }
    })
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }

  getPackgePriceLabel(id) {
    return new Promise((resolve, reject) => {
      Package.findOne({_id: id})
      .populate({
            path:'awbId',
            populate:{
                path:'invoices'
            }
    })
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }
  updatePriceLabel(priceLabel,id) {
    return new Promise(async (resolve, reject) => {
    //   const PriceLabelData = await this.getPriceLabel(priceLabel.id);
    //   if (!(PriceLabelData && PriceLabelData._id)) {
    //     return resolve({success: false, message: strings.string_not_found_location});
    //   }

      PriceLabel.findOneAndUpdate(
        { packageId: id }, 
        priceLabel,
        {upsert:true,new:true},
        (err, result) => {
          if (err) {
            resolve({ success: false, message: strings.string_response_error });
          } else {
            resolve({ success: true, message: strings.string_response_updated });
          }
        }
      )
    });
  }
  removePriceLabel(id) {
    return new Promise((resolve, reject) => {
      PriceLabel.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
    })
  }
}

module.exports = PriceLabelService;