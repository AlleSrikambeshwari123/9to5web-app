


export class PackageUtility{
    
    constructor(){
        this._EXRATE = 7.0 ; 
        this._VAT = 0.125; 
        this._BROKERAGE = 0.3; 
        this._FUEL = 0.15; 
        this._AIR_SHIPPING_FEE = [2.57,2.50,2.25]
        this._SEA_SHIPPING_FEE = 0.95;
    }

    calculateFees(cpackage){
      
        //caclulate for sea 
        cpackage  = Object.assign(cpackage,this.calculateCargoFees(cpackage))
        return cpackage ; 
    }

   
    calculateCargoFees(cpackage){
         
        var fees = {
            ttvalue:0,
            duty:0,
            vat:0,
            shippingValue:0,
            opt:0,
            fuelFee:0,
            brokerageFee:0
        }; 

        //do your cals here 

        fees.ttvalue = cpackage.value * this._EXRATE; 
        fees.freight = cpackage.weight * this._EXRATE;
        
        fees.insurance = fees.ttvalue * .02; 
        fees.duty = cpackage.dutyPercent * (fees.ttvalue + fees.freight);
        fees.opt = (fees.ttvalue + fees.freight) *.07; 
        if (cpackage.hasOpt == false )
            fees.opt = 0; 
        fees.vat = (fees.ttvalue + fees.duty + fees.freight) * this._VAT; 

        //shipping cost calculated based on weight  
        if (cpackage.mtype !=2){
            if (0>= cpackage.weight <=25){
            
                fees.shippingValue = cpackage.weight * this._AIR_SHIPPING_FEE[0]; 
            }
            else if (25 > cpackage.weight <=50 ){
                fees.shippingValue = cpackage.weight * this._AIR_SHIPPING_FEE[1]; 
            }
            else if (cpackage.weight>50){
                fees.shippingValue = cpackage.weight * this._AIR_SHIPPING_FEE[2]; 
            }
            
            fees.shippingValue = fees.shippingValue * this._EXRATE; 
            fees.brokerageFee = (fees.duty + fees.vat + fees.opt) * this._BROKERAGE;
        }
        else {
            //shipping by sea 
            fees.shippingValue = cpackage.weight * this._SEA_SHIPPING_FEE; 
            fees.billOfLaden  = 10 * this._EXRATE; 
            fees.docFee = 10 * this._EXRATE; 
            fees.brokerageFee = fees.ttvalue * this._BROKERAGE; 
        }
        
        //common fees to both air and shipping 
        fees.fuelFee = fees.shippingValue * this._FUEL;
        fees.totalCost = (fees.duty + fees.shippingValue + fees.opt+ fees.brokerageFee + fees.fuelFee + fees.vat); 

        
        return fees ; 
    }


}