const strings = require('../Res/strings');
const PriceLabel = require('../models/pricelabel');
const Package = require('../models/package');
const Awb = require('../models/awb');
const services = require('../Services/RedisDataServices')
class AwbPriceLabelService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
    this.services = services;
  }

  getPriceLabel(id) {
    return new Promise((resolve, reject) => {
      PriceLabel.findOne({awbId: id})
      .populate({
        path:'awbId',            
        populate:[{
             path:'invoices'
         },
         {
            path:'packages'  
         }
        ]        
    })
      .exec((err, result) => {
        if (err || result === null) {
          resolve({success:false,message:'Price Label Does not Exist For this AWB.'});
        } else {
          resolve(result);
        }
      });
    })
  }

  getAwbPriceLabel(id) {
    return new Promise((resolve, reject) => {
      Awb.findOne({_id: id})
      .populate({
        path:'invoices'        
     })
      .exec(async (err, result) => {
        if (err) {
          resolve({});
        } else {
          let customer = await this.services.customerService.getCustomer({_id:result.customerId})
          result._doc.company = customer.company ? customer.company.name:''
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
      priceLabel.CustomsVAT = (Number(priceLabel.TotalInvoiceValue) + Number(priceLabel.Freight) + Number(priceLabel.Duty)+ Number(priceLabel.CustomsProc)+Number(priceLabel.EnvLevy)) * Number(priceLabel.VatMultiplier)
      priceLabel.ServiceVat = (Number(priceLabel.NoDocs) + Number(priceLabel.Insurance) + Number(priceLabel.Storage) + Number(priceLabel.Brokerage) +Number(priceLabel.Express) + Number(priceLabel.Delivery) ) * Number(priceLabel.VatMultiplier)

      PriceLabel.findOneAndUpdate(
        { awbId: id }, 
        priceLabel,
        {upsert:true,new:true},
        async (err, result) => {
          if (err) {
              console.log(err)
            resolve({ success: false, message: strings.string_response_error });
          } else {
            let awb = await Awb.findById(id)
            let total_weight = 0
            awb.packages.forEach(async (data,index)=>{
              let pack = await Package.findById(data)
              total_weight = total_weight + pack.weight 
              if(index == awb.packages.length-1){
                resolve({ success: true, message: strings.string_response_updated ,totalWeight : total_weight.toFixed(2)});
              }
            })
          }
        }
      )
    });
  }


/////////////////////////////////////////////////////////////////////////////////////




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

module.exports = AwbPriceLabelService;