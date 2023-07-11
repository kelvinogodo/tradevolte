const mongoose = require('mongoose')

const user = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true,unique: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    funded: { type: Number },
    capital: { type: Number,default:0 },
    investment: { type:[Object] },
    transaction: { type:[Object] },
    withdraw: { type:[Object] },
    deposit:{ type:[Object], default:[] },
    rememberme:{type:Boolean},
    verified:{type:Boolean, default:false},
    referral:{type:String,unique:true},
    refBonus:{type:Number},
    referred: { type: [Object], default: [] },
    upline:{type:String,default:''},
    phonenumber:{type:String,default:''},
    state:{type: String,default:''},
    country:{type: String,default:''},
    zipcode:{type: String,default:''},
    address:{type: String,default:''},
    profilepicture:{type:String,default:''},
    totalprofit:{type:Number,default:0},
    periodicProfit:{type:Number,default:0},
    totaldeposit:{type:Number,default:0},
    totalwithdraw:{type:Number,default:0},
    promo:{type:Boolean,default:false},
    withdrawDuration:{type:Number,default:0},
    completed:{type:Boolean,default:false},
  }
)
const User = mongoose.models.User || mongoose.model('User', user)
module.exports = User