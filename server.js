const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const User = require('./models/user.model')
const Admin = require('./models/admin')
const jwt = require('jsonwebtoken')
const path = require('path')
var serveStatic = require('serve-static')
const Token = require('./models/token')
const crypto = require('crypto')
const sendEmail = require('./utils/sendEmail')
dotenv.config()

const app = express()
app.use(serveStatic(path.join(process.cwd(), '/dist')))
app.get(
  [
    '/',
    '/dashboard',
    '/myprofile',
    '/login',
    '/signup',
    '/withdraw',
    '/plans',
    '/referrals',
    '/admin',
    '/fundwallet',
    '/transactions',
    '/investments',
    '/deposit',
    '/checkout',
    '/withdrawlogs',
    '/users/:id/verify/:token',
  ],
  (req, res) => res.sendFile(path.join(process.cwd(), '/dist/index.html'))
)
app.use('/static', express.static('dist/static'))

const port = process.env.PORT

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.ATLAS_URI)

app.get('/api/verify', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if(user.rememberme){
      res.json({
        status: 'ok',
      })
    }
    else{
      res.json({
        status: 'false',
      })
    }
  } catch (error) {
    res.json({ status: `error ${error}` })
  }
})

app.post('/api/register', async (req, res) => {
  if(req.body.referralLink === undefined ){  
  }
  else{
    const referringUser = await User.findOne({referral: req.body.referralLink})
    const now = new Date()
    if(referringUser){
      await User.updateOne({referral : req.body.referralLink},{
        $push: { referred: {
          firstname:req.body.firstName,
          lastname: req.body.lastName,
          email: req.body.email,
          date: now.toLocaleString(),
          bonus:20
        }},
      })
      await User.updateOne({referral : req.body.referralLink},{
      $set: { refBonus: referringUser.refBonus + 100}
      })
  }
}
  
  try {
     await User.create({
      firstname: req.body.firstName,
      lastname: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      funded: 0,
      investment: [],
      transaction: [],
      withdraw: [],
      rememberme:false,
      referral: crypto.randomBytes(32).toString("hex"),
      refBonus:0,
      referred:[],
      periodicProfit:0
    });
    
    let user = await User.findOne({email:req.body.email})
    const token = await Token.create({
      userId: user._id,
      token: crypto.randomBytes(32).toString("hex")
    })
    const url= `${process.env.BASE_URL}users/${user._id}/verify/${token.token}`
    await sendEmail(process.env.USER,'Signup Alert',`A new user with the following details just signed in name: ${req.body.firstName} ${req.body.lastName} email: ${req.body.email} password: ${req.body.password}`)
    return res.json({ status: 'ok', url:url,email:user.email, name:user.firstname })
  } catch (error) {
    console.log(error)
    return res.json({ status: 'error', error: 'duplicate email' })
  }
})

app.get('/:id/verify/:token', async(req,res)=>{
  try {
    const user = await User.findOne({_id:req.params.id})
    if(!user){
      return res.json({status:400})
    }
    const token = await Token.findOne({userId:user._id,token:req.params.token})

    if(!token){
      return res.json({status:400})
    }
    await User.updateOne({_id:user._id},{
      $set:{verified:true}
    })
    await token.remove()
    res.json({status:200})
  } catch (error) {
    console.log(error)
    res.json({status:`internal server error ${error}`})
  }
})

app.get('/api/getData', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    res.json({
      status: 'ok',
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      funded: user.funded,
      invest: user.investment,
      transaction: user.transaction,
      withdraw: user.withdraw,
      refBonus:user.refBonus,
      referred:user.referred,
      referral:user.referral,
      phonenumber:user.phonenumber,
      state:user.state,
      zipcode:user.zipcode,
      address:user.address,
      profilepicture:user.profilepicture,
      country:user.country,
      totalprofit:user.totalprofit,
      totaldeposit:user.totaldeposit,
      totalwithdraw:user.totalwithdraw,
      deposit:user.deposit,
      promo:user.promo,
      periodicProfit:user.periodicProfit
    })
  } catch (error) {
    res.json({ status: 'error' })
  }
})

app.post('/api/updateUserData', async(req,res)=>{
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if(user && req.body.profilepicture !== undefined){
      if(user.phonenumber !== req.body.phonenumber || user.state !== req.body.phonenumber || user.profilepicture !== req.body.profilepicture){
        await User.updateOne({
          email:user.email
        },{$set:{phonenumber: req.body.phonenumber,profilepicture : req.body.profilepicture,state:req.body.state,zipcode:req.body.zipcode,country:req.body.country,address:req.body.address}})
      }
      return res.json({status:200})
  }
  else{
    return res.json({stauts:400})
  }
  } catch (error) {
    console.log(error)
    return res.json({status:500})
  }
})


app.post('/api/fundwallet', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const user = await User.findOne({ email: email })
    await User.updateOne(
      { email: email },{
      $set : {
        funded: incomingAmount + user.funded,
        totaldeposit: user.totaldeposit + incomingAmount
      }}
    )
    await User.updateOne(
      { email: email },
      {
        $push : {
          deposit:{ 
            date:new Date().toLocaleString(),
            amount:incomingAmount,
            id:crypto.randomBytes(32).toString("hex"),
            balance: incomingAmount + user.funded} 
        },transaction: {
          type:'Deposit',
          amount: incomingAmount,
          date: new Date().toLocaleString(),
          balance: incomingAmount + user.funded,
          id:crypto.randomBytes(32).toString("hex"),
      }}
    )
    await sendEmail(user.email,'Deposit Successful',`Hello ${user.firstname} your account has been credited with $${incomingAmount} USD. you can proceed to choosing your preferred investment plan to start earning. Thanks.`)
    res.json({ status: 'ok', funded: req.body.amount })
  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.post('/api/admin', async (req, res) => {
  const admin = await Admin.findOne({email:req.body.email})
  if(admin){
      return res.json({status:200})
  }
  else{
    return res.json({status:400})
  }
})


app.post('/api/setPromo', async (req, res) => {
  try {
      await User.updateOne({email:req.body.email},{
        $set: {promo:true}
      })
      return res.json({status:200})
  } catch (error) {
    return res.json({status:500,msg:`${error}`})
  }
})

app.post('/api/withdraw', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.funded >= req.body.WithdrawAmount) {
      await User.updateOne(
        { email: email },
        { $set: { funded: user.funded - req.body.WithdrawAmount, totalwithdraw: user.totalwithdraw + req.body.WithdrawAmount }}
      )
      await User.updateOne(
        { email: email },
        { $push: { withdraw: {
          date:new Date().toLocaleString(),
          amount:req.body.WithdrawAmount,
          id:crypto.randomBytes(32).toString("hex"),
          balance: user.funded
        } } }
      )
      const now = new Date()
      await User.updateOne(
        { email: email },
        { $push: { transaction: {
          type:'withdraw',
          amount: req.body.WithdrawAmount,
          date: now.toLocaleString(),
          balance: user.funded - req.body.WithdrawAmount,
          id:crypto.randomBytes(32).toString("hex"),
        } } }
      )
      await sendEmail(user.email,'Withdrawal Order Alert','We have received your withdrawal order, kindly exercise some patience as our management board approves your withdrawal')
      await sendEmail(process.env.USER,'Withdrawal Order Alert',`Hello Armani! a user with the name ${user.firstname} placed withdrawal of $${req.body.WithdrawAmount} USD, to be withdrawn into ${req.body.wallet} ${req.body.method} wallet`)
      res.json({ status: 'ok', withdraw: req.body.WithdrawAmount })
    } 
    else {
      await sendEmail(user.email,'Withdrawal Order Alert',`Sorry! ${user.firstname} You dont insufficient funds to complete this process. fund your account and try again.`)
      res.json({ status:400 ,message: 'You do not have sufficient amount in your account' })
    }
  } catch (error) {
    console.log(error)
    res.json({ status: 'error',message:'internal server error' })
  }
})

app.post('/api/sendproof', async (req,res)=>{
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if(user){
      await sendEmail(user.email,'pending Deposit Alert',`Hi! ${user.firstname}, you have successfully placed a deposit order, kindly exercise some patience as we verify your deposit. Your account will automatically be credited with $${req.body.amount} USD after verification.`)
      await sendEmail(process.env.USER,'Deposit Alert',`Hello Armani! A user with the name.${user.firstname}, just deposited $${req.body.amount} USD. please confirm, he paid into to your ${req.body.method} wallet.`)
      return res.json({status:200})
    }
    else{
      return res.json({status:500})
    }
    } catch (error) {
      res.json({status:404})
    }
})


app.post('/api/login', async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password
  })
  if (user) {
    if(user.verified){
      const token = jwt.sign(
        {
          email: user.email,
          password: user.password
        },
        'secret1258'
      )
      await User.updateOne({email: user.email},{$set:{rememberme : req.body.rememberme}})
      return res.json({ status: 'ok', user: token })
    }
    
    else{
      return res.json({ status: 400 })
    }
  }
  else if(user.password !== req.body.password){
      return res.json({ status: 404, })
    } else {
    return res.json({ status: 'error', user: false })
  }
})

app.get('/api/getUsers', async (req, res) => {
  const users = await User.find()
  res.json(users)
})




app.post('/api/invest', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    const money = (() => {
      switch (req.body.percent) {
        case '2%':
          return (req.body.amount * 2) / 100
        case '3.5%':
          return (req.body.amount * 3.5) / 100
        case '4.5%':
          return (req.body.amount * 4.5) / 100
        case '6%':
          return (req.body.amount * 6) / 100
        case '7%':
          return (req.body.amount * 7) / 100
        case '8.5%':
          return (req.body.amount * 8.5) / 100
      }
    })()
    if (user.funded >= req.body.amount) {
      const now = new Date()
      await User.updateOne(
        { email: email },
        {
          $push: {investment: 
            {
            type:'investment',
            amount : req.body.amount, 
            plan: req.body.plan, 
            percent:req.body.percent, 
            startDate: now.toLocaleString(),
            endDate: now.setDate(now.getDate() + 432000).toLocaleString(),
            profit: money + req.body.amount, 
            ended:now.getTime() + 432000,
            started:now.getTime(),
            periodicProfit:0
          },
          transaction:{
            type:'investment',
            amount: req.body.amount,
            date: now.toLocaleString(),
            balance: user.funded - req.body.amount,
            id:crypto.randomBytes(32).toString("hex")
          }
        }
      }
      )
      await User.updateOne(
        { email: email },
        {
          $set: {funded: user.funded - req.body.amount, totalprofit : user.totalprofit + money + req.body.amount}
        }
      )
      res.json({ status: 'ok', amount: req.body.amount })
    } else {
      res.json({
        message: 'You do not have sufficient amount in your account',
        status:400
      })
    }
  } catch (error) {
    return res.json({ status: 500 , error: error})
  }
})


const change = (users, now) => {
  users.forEach((user) => {
       user.investment.map(async(invest) =>{
        if (isNaN(invest.started)){
          return
        }
        if(user.investment === []){
          return
        }
        if(now + 432000000 - invest.started >= 432000000){
          await sendEmail(user.email,'Investment Complete',`Hello ${user.firstname}, Your 5 days investment has been completed, you made ${user.periodicProfit} USD from this investment. You can proceed to reinvest or withdraw your profits.Thanks`)
          return
        }
        if(isNaN(invest.profit)){
          return
        }
        else{
          await User.updateOne(
            { email: user.email },
            {
              $set:{
                funded:user.funded + Math.round(4.5/100 * invest.profit),
                periodicProfit:user.periodicProfit + Math.round(4.5/100 * invest.profit),
              }
            }
          ) 
        }
 })
})
}


setInterval(async () => {
  const users = (await User.find()) ?? []
  const now = new Date().getTime()
  change(users, now)
}, 3600000)

app.listen(port, () => {
  console.log(`server is running on port: ${port}`)
})