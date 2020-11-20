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
          let pkg = result.awbId
          result = this.calculations(result,pkg)
          resolve(result);
        }
      });
    })
  }
  calculations(result,pkg){
    var totalweightVal = 0,totalVolumetricWeight=0;
    if (pkg.packages) {
      const pa = pkg.packages;
      for (var i = 0; i < pa.length; i++) {
        var weight = pa[i].weight;
        if (pa[i].packageCalculation == 'kg' || pa[i].packageCalculation == 'Kg') {
          weight = 2.20462 * pa[i].weight;
        }
        totalweightVal = totalweightVal + weight;
        let check = 1;
        pa[i].dimensions.split('x').forEach(data =>{
          check = check * data
        })
        let volumetricWeight = (check/166);
        totalVolumetricWeight = totalVolumetricWeight + volumetricWeight;
      }
    }
    result.TotalWeightValue = totalweightVal
    result.TotalVolumetricWeight = totalVolumetricWeight
    result.Express = result.Express ? result.Express.toFixed(2) : 0
    
    if(result.Express >0){
      result.Express = 35
      if(result.TotalWeightValue >= 12 || result.TotalVolumetricWeight >=12 ){
        if(result.TotalWeightValue > result.TotalVolumetricWeight){
          result.Freight = result.TotalWeightValue * 3
        }
        else{
          result.Freight = result.TotalVolumetricWeight * 3
        }
      }else{
        result.Freight =  35
      }
    }else{
      result.Express = 0
      if(result.TotalWeightValue >= 2 || result.TotalVolumetricWeight >=2 ){
        if(result.TotalWeightValue > result.TotalVolumetricWeight)
          result.Freight = result.TotalWeightValue * 1.55
        else
          result.Freight = result.TotalVolumetricWeight * 1.55
      }else{
        result.Freight =  3.10
      }
    }
    result.Brokerage = result.Brokerage ? result.Brokerage.toFixed(2) : 0
    result.CustomsProc = result.CustomsProc ? result.CustomsProc.toFixed(2) : 0 
    result.CustomsVAT = result.CustomsVAT ? result.CustomsVAT.toFixed(2) : 0 
    result.VatMultiplier = result.VatMultiplier ? result.VatMultiplier.toFixed(2) : 0.12
    result.Delivery =  result.Delivery ? result.Delivery.toFixed(2): 0 
    result.Duty =  result.Duty ? result.Duty.toFixed(2) : 0
    result.EnvLevy = result.EnvLevy ? result.EnvLevy.toFixed(2) : 0
    result.Freight = result.Freight ? result.Freight.toFixed(2) : 0
    result.Hazmat = result.Hazmat ? result.Hazmat.toFixed(2) : 0
    result.NoDocs = result.NoDocs ? result.NoDocs.toFixed(2) : 0
    result.Pickup = result.Pickup ? result.Pickup.toFixed(2)  : 0
    result.Sed = result.Sed ? result.Sed.toFixed(2) : 0
    result.ServiceVat = result.ServiceVat ? result.ServiceVat.toFixed(2) : 0 
    result.TotalWet = result.TotalWet ?result.TotalWet.toFixed(2) : 0
    result.TotalWeightValue = result.TotalWeightValue ? result.TotalWeightValue.toFixed(2) : 0
    result.TotalVolumetricWeight = result.TotalVolumetricWeight ? result.TotalVolumetricWeight.toFixed(2) : 0
    result.totalPrice = result.totalPrice ? result.totalPrice.toFixed(2) : 0
    result.Storage = result.Storage ? result.Storage.toFixed(2) : 0 

    let totalinvoiceVal = 0;
    if (pkg.invoices) {
      pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
      result.NoOfInvoice = pkg.invoices.length
    }
    result.TotalInvoiceValue = totalinvoiceVal
    result.NoOfInvoice = result.NoOfInvoice ?result.NoOfInvoice : 0
    result.TotalInvoiceValue = result.TotalInvoiceValue ? result.TotalInvoiceValue.toFixed(2) : 0
    result.Insurance = 0
    
    if(result.OverrideInvoiceValue){
      if(result.OverrideInvoiceValue > 0)
        result.OverrideInvoiceValue = result.OverrideInvoiceValue 
      else
        result.OverrideInvoiceValue = result.TotalInvoiceValue 
    }else{
      result.OverrideInvoiceValue = result.TotalInvoiceValue 
    }
    if(result.OverrideInvoiceValue >= 100)
      result.Insurance = result.OverrideInvoiceValue * 0.015

    result.CustomsVAT = (Number(result.OverrideInvoiceValue) + Number(result.Freight) + Number(result.Duty)+ Number(result.CustomsProc)+Number(result.EnvLevy)) * Number(result.VatMultiplier)
    result.ServiceVat = (Number(result.Insurance) + Number(result.Storage) + Number(result.Brokerage) +Number(result.Express) + Number(result.Delivery) ) * Number(result.VatMultiplier)
    
    let sum = Number(result.CustomsVAT) + Number(result.ServiceVat) + Number(result.Freight) + Number(result.Duty)+ Number(result.CustomsProc)+Number(result.EnvLevy) +Number(result.NoDocs) +
    Number(result.Insurance) + Number(result.Storage) + Number(result.Brokerage) +Number(result.Express) + Number(result.Delivery) + Number(result.Hazmat) + Number(result.Pickup) + Number(result.Sed)
    result.SumOfAllCharges = sum

    result.SumOfAllCharges = result.SumOfAllCharges ? result.SumOfAllCharges.toFixed(2) : 0
  
      
    result.Insurance = result.Insurance ? result.Insurance.toFixed(2) : 0 
    result.CustomsVAT = result.CustomsVAT ? result.CustomsVAT.toFixed(2) : 0 
    result.ServiceVat = result.ServiceVat ? result.ServiceVat.toFixed(2) : 0 

    let total =  Number(result.Brokerage) + Number(result.CustomsProc) + Number(result.SumOfAllCharges) + Number(result.CustomsVAT) + Number(result.Delivery) + Number(result.Duty) + Number(result.EnvLevy) + Number(result.Freight) + Number(result.Hazmat) + Number(result.Pickup) + Number(result.NoDocs) + Number(result.Insurance) + Number(result.Sed) + Number(result.Express) + Number(result.ServiceVat)+ Number(result.Storage)
    result.TotalWet = total

    result.TotalWet = result.TotalWet ? result.TotalWet.toFixed(2) : 0
    result.Express = result.Express ? result.Express.toFixed(2) : 0
    return result
  }

  getAwbPriceLabel(id) {
    return new Promise((resolve, reject) => {
      Awb.findOne({_id: id})
      .populate({
        path:'invoices'        
     }).populate({
          path:'packages'        
      })
      .exec(async (err, result) => {
        if (err) {
          resolve({});
        } else {
          let customer = await this.services.customerService.getCustomer({_id:result.customerId})
          result._doc.company = customer.company ? customer.company.name:''
          result = result.toJSON()
          let pkg = result
          result = this.calculations(result,pkg)
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
      if(priceLabel.Express >0){
        priceLabel.Express = 35
        if(priceLabel.TotalWeightValue >= 12 || priceLabel.TotalVolumetricWeight >=12 ){
          if(priceLabel.TotalWeightValue > priceLabel.TotalVolumetricWeight){
            priceLabel.Freight = priceLabel.TotalWeightValue * 3
          }
          else{
            priceLabel.Freight = priceLabel.TotalVolumetricWeight * 3
          }
        }else{
          priceLabel.Freight =  35
        }
      }else{
        priceLabel.Express = 0
        if(priceLabel.TotalWeightValue >= 2 || priceLabel.TotalVolumetricWeight >=2 ){
          if(priceLabel.TotalWeightValue > priceLabel.TotalVolumetricWeight)
            priceLabel.Freight = priceLabel.TotalWeightValue * 1.55
          else
            priceLabel.Freight = priceLabel.TotalVolumetricWeight * 1.55
        }else{
          priceLabel.Freight =  3.10
        }
      }
      priceLabel.Insurance = 0
      if(priceLabel.OverrideInvoiceValue >= 100)
        priceLabel.Insurance = priceLabel.OverrideInvoiceValue * 0.015

      priceLabel.CustomsVAT = (Number(priceLabel.OverrideInvoiceValue) + Number(priceLabel.Freight) + Number(priceLabel.Duty)+ Number(priceLabel.CustomsProc)+Number(priceLabel.EnvLevy)) * Number(priceLabel.VatMultiplier)
      priceLabel.ServiceVat = (Number(priceLabel.Insurance) + Number(priceLabel.Storage) + Number(priceLabel.Brokerage) +Number(priceLabel.Express) + Number(priceLabel.Delivery) ) * Number(priceLabel.VatMultiplier)
     
      priceLabel.SumOfAllCharges = Number(priceLabel.CustomsVAT) + Number(priceLabel.ServiceVat) + Number(priceLabel.Freight) + Number(priceLabel.Duty)+ Number(priceLabel.CustomsProc)+Number(priceLabel.EnvLevy) +Number(priceLabel.NoDocs) +
       Number(priceLabel.Insurance) + Number(priceLabel.Storage) + Number(priceLabel.Brokerage) +Number(priceLabel.Express) + Number(priceLabel.Delivery) + Number(priceLabel.Hazmat) + Number(priceLabel.Pickup)  + Number(priceLabel.Sed)
     
       let total =  Number(priceLabel.Brokerage) + Number(priceLabel.CustomsProc) + Number(priceLabel.SumOfAllCharges) + Number(priceLabel.CustomsVAT) + Number(priceLabel.Delivery) + Number(priceLabel.Duty) + Number(priceLabel.EnvLevy) + Number(priceLabel.Freight) + Number(priceLabel.Hazmat) + Number(priceLabel.Pickup) + Number(priceLabel.NoDocs) + Number(priceLabel.Insurance) + Number(priceLabel.Sed) + Number(priceLabel.Express) + Number(priceLabel.ServiceVat)+ Number(priceLabel.Storage)
       priceLabel.TotalWet = total

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
            if(awb.packages.length == 0){
              resolve({ success: true, message: strings.string_response_updated ,totalWeight : 0.00});
            }else{
              awb.packages.forEach(async (data,index)=>{
                let pack = await Package.findById(data)
                total_weight = total_weight + pack.weight 
                if(index == awb.packages.length-1){
                  resolve({ success: true, message: strings.string_response_updated ,totalWeight : total_weight.toFixed(2)});
                }
              })
            }
          }
        }
      )
    });
  }


  editPriceLabel(priceLabel,id) {
    return new Promise(async (resolve, reject) => {
    //   const PriceLabelData = await this.getPriceLabel(priceLabel.id);
    //   if (!(PriceLabelData && PriceLabelData._id)) {
    //     return resolve({success: false, message: strings.string_not_found_location});
    //   }

      let priceResult = await PriceLabel.findOne({awbId: id});
      priceResult.Express = priceLabel.Express
      priceResult.TotalInvoiceValue = priceLabel.TotalInvoiceValue
      priceResult.NoOfInvoice = priceLabel.NoOfInvoice
      priceResult.TotalWeightValue = priceLabel.TotalWeightValue
      priceResult.TotalVolumetricWeight = pricelLabel.TotalVolumetricWeight

      if(priceLabel.Express >0){
        priceLabel.Express = 35
        if(priceLabel.TotalWeightValue >= 12 || priceLabel.TotalVolumetricWeight >=12 ){
          if(priceLabel.TotalWeightValue > priceLabel.TotalVolumetricWeight){
            priceLabel.Freight = priceLabel.TotalWeightValue * 3
          }
          else{
            priceLabel.Freight = priceLabel.TotalVolumetricWeight * 3
          }
        }else{
          priceLabel.Freight =  35
        }
      }else{
        priceLabel.Express = 0
        if(priceLabel.TotalWeightValue >= 2 || priceLabel.TotalVolumetricWeight >=2 ){
          if(priceLabel.TotalWeightValue > priceLabel.TotalVolumetricWeight)
            priceLabel.Freight = priceLabel.TotalWeightValue * 1.55
          else
            priceLabel.Freight = priceLabel.TotalVolumetricWeight * 1.55
        }else{
          priceLabel.Freight =  3.10
        }
      }

      if(priceLabel.OverrideInvoiceValue >= 100)
        priceLabel.Insurance = priceLabel.OverrideInvoiceValue * 0.015

      priceLabel.CustomsVAT = (Number(priceLabel.OverrideInvoiceValue) + Number(priceLabel.Freight) + Number(priceLabel.Duty)+ Number(priceLabel.CustomsProc)+Number(priceLabel.EnvLevy)) * Number(priceLabel.VatMultiplier)
      priceLabel.ServiceVat = (Number(priceLabel.Insurance) + Number(priceLabel.Storage) + Number(priceLabel.Brokerage) +Number(priceLabel.Express) + Number(priceLabel.Delivery) ) * Number(priceLabel.VatMultiplier)
     
      priceLabel.SumOfAllCharges = Number(priceLabel.CustomsVAT) + Number(priceLabel.ServiceVat) + Number(priceLabel.Freight) + Number(priceLabel.Duty)+ Number(priceLabel.CustomsProc)+Number(priceLabel.EnvLevy) +Number(priceLabel.NoDocs) +
       Number(priceLabel.Insurance) + Number(priceLabel.Storage) + Number(priceLabel.Brokerage) +Number(priceLabel.Express) + Number(priceLabel.Delivery) + Number(priceLabel.Hazmat) + Number(priceLabel.Pickup)  + Number(priceLabel.Sed)
     
       let total =  Number(priceLabel.Brokerage) + Number(priceLabel.CustomsProc) + Number(priceLabel.SumOfAllCharges) + Number(priceLabel.CustomsVAT) + Number(priceLabel.Delivery) + Number(priceLabel.Duty) + Number(priceLabel.EnvLevy) + Number(priceLabel.Freight) + Number(priceLabel.Hazmat) + Number(priceLabel.Pickup) + Number(priceLabel.NoDocs) + Number(priceLabel.Insurance) + Number(priceLabel.Sed) + Number(priceLabel.Express) + Number(priceLabel.ServiceVat)+ Number(priceLabel.Storage)
       priceLabel.TotalWet = total

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
            if(awb.packages.length == 0){
              resolve({ success: true, message: strings.string_response_updated ,totalWeight : 0.00});
            }else{
              awb.packages.forEach(async (data,index)=>{
                let pack = await Package.findById(data)
                total_weight = total_weight + pack.weight 
                if(index == awb.packages.length-1){
                  resolve({ success: true, message: strings.string_response_updated ,totalWeight : total_weight.toFixed(2)});
                }
              })
            }
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