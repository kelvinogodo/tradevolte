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
    '/faq',
    '/about',
    '/policy',
    '/buybitcoin',
    '/goldstock',
    '/agrotech',
    '/realestate',
    '/user/:id/',
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

// register route 
app.post('/api/register', async (req, res) => {
    const referringUser = await User.findOne({username: req.body.referralLink})
    const now = new Date()
  try {
    if(referringUser){
      await User.updateOne({username : req.body.referralLink},{
        $push: { referred: {
          firstname:req.body.firstName,
          lastname: req.body.lastName,
          email: req.body.email,
          date: now.toLocaleString(),
          bonus:'10%'
        }},
      })
    }
     await User.create({
      firstname: req.body.firstName,
      lastname: req.body.lastName,
      username:req.body.userName,
      email: req.body.email,
      password: req.body.password,
      funded: 0,
      investment: [],
      transaction: [],
      withdraw: [],
      rememberme:false,
      referral: `${crypto.randomBytes(32).toString("hex")}`,
      refBonus:0,
      referred:[],
      periodicProfit: 0,
      upline: req.body.referralLink,
      country: req.body.country,
      phonenumber:req.body.phone
    });
    
    let user = await User.findOne({email:req.body.email})
    const verification = jwt.sign(
        {
          email: user.email,
          password: user.password
        },
        'secret1258'
    )
    if (!referringUser) {
      return res.json({
        status: 'ok',
        email: user.email,
        name: user.firstname,
        token: verification,
        adminSubject: 'User Signup Alert',
        message: `A new user with the following details just signed in name: ${req.body.firstName} ${req.body.lastName} email: ${req.body.email} password: ${req.body.password}`,
        subject: 'Successful User Referral Alert',
        referringUser:null
      })
    }
    else {
        return res.json({
        status: 'ok',
        email: user.email,
        name: user.firstname,
        token: verification,
        adminSubject:'User Signup Alert',
        message: `A new user with the following details just signed in name: ${req.body.firstName} ${req.body.lastName} email: ${req.body.email} password: ${req.body.password}`,
        referringUserEmail: referringUser.email,
        referringUserName: referringUser.firstname,
        referringUserMessage: `A new user with the name ${user.firstname} ${user.lastname} just signed up with your refferal link. You are will now earn 10% of every deposit this user makes. Keep referring to earn more.`,
        subject:'Successful User Referral Alert'
      })
      }
    
  } catch (error) {
    console.log(error)
    return res.json({ status: 'error', error: 'email already exists' })
  }
})

app.get('/:id/refer', async(req,res)=>{
  try {
    const user = await User.findOne({username:req.params.id})
    if(!user){
      return res.json({status:400})
    }
    res.json({status:200,referredUser:req.params.id})
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
      username:user.username,
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
        capital :user.capital + incomingAmount,
        totaldeposit: user.totaldeposit + incomingAmount
      }}
    )
    const upline = await User.findOne({ username: user.upline })
    if (upline) {
      await User.updateOne({ username: user.upline }, {
        $set: {
          refBonus: 10 / 100 * incomingAmount,
          totalprofit: upline.totalprofit + (10 / 100 * incomingAmount),
          capital: upline.capital + (10 / 100 * incomingAmount),
          funded: upline.funded + (10 / 100 * incomingAmount),
        }
      })
    }

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

    if (upline) {
        res.json({
        status: 'ok',
        funded: req.body.amount,
        name: user.firstname,
        email: user.email,
        message: `your account has been credited with $${incomingAmount} USD. you can proceed to choosing your preferred investment plan to start earning. Thanks.`,
        subject: 'Deposit Successful',
        uplineName: upline.firstname,
        uplineEmail: upline.email,
        uplineSubject: `Earned Referral Commission`,
        uplineMessage:`Congratulations! You just earned $${10/100 * incomingAmount} in commission from ${user.firstname} ${user.lastname}'s deposit of $${incomingAmount}.`
    })
    }
    else {
      res.json({
      status: 'ok',
      funded: req.body.amount,
      name: user.firstname,
      email: user.email,
      message: `your account has been credited with $${incomingAmount} USD. you can proceed to choosing your preferred investment plan to start earning. Thanks.`,
      subject: 'Deposit Successful',
      upline:null
    })
    }
    
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


app.post('/api/deleteUser', async (req, res) => {
  try {
      await User.deleteOne({email:req.body.email})
      return res.json({status:200})
  } catch (error) {
    return res.json({status:500,msg:`${error}`})
  }
})

app.post('/api/upgradeUser', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const user = await User.findOne({ email: email })
    if (user) {
      await User.updateOne(
        { email: email }, {
        $set: {
          funded: incomingAmount + user.funded,
          capital: user.capital + incomingAmount,
          totalProfit: user.totalprofit + incomingAmount,
          periodicProfit: user.periodicProfit + incomingAmount
        }
      }
      )
      res.json({
        status: 'ok',
        funded: req.body.amount
      })
    }
  }
  catch (error) {
    res.json({
        status: 'error',
      })
  }
    

})

app.post('/api/withdraw', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.totalprofit >= req.body.WithdrawAmount ) {
      await User.updateOne(
        { email: email },
        { $set: { funded: user.funded - req.body.WithdrawAmount, totalwithdraw: user.totalwithdraw + req.body.WithdrawAmount, capital: user.capital - req.body.WithdrawAmount, totalprofit: user.totalprofit - req.body.WithdrawAmount }}
      )
      await User.updateOne(
        { email: email },
        { $push: { withdraw: {
          date:new Date().toLocaleString(),
          amount:req.body.WithdrawAmount,
          id:crypto.randomBytes(32).toString("hex"),
          balance: user.funded - req.body.WithdrawAmount
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
      return res.json({
            status: 'ok',
            withdraw: req.body.WithdrawAmount,
            email: user.email,
            name: user.firstname,
            message: `We have received your withdrawal order, kindly exercise some patience as our management board approves your withdrawal`,
            subject: 'Withdrawal Order Alert',
            adminMessage: `Hello ARMANI! a user with the name ${user.firstname} placed withdrawal of $${req.body.WithdrawAmount} USD, to be withdrawn into ${req.body.wallet} ${req.body.method} wallet`,
      })
    }
   
  else{
      res.json({
      status: 400,
      subject:'Failed Withdrawal Alert',
      email: user.email,
      name: user.firstname,
      withdrawMessage:`We have received your withdrawal order, but you can only withdraw your profits. Kindly invest more, to rack up more profit, Thanks.`
      })
  }}
   catch (error) {
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
            return res.json({
            status: 200,
            email: user.email,
            name: user.firstname,
            message: `Hi! you have successfully placed a deposit order, kindly exercise some patience as we verify your deposit. Your account will automatically be credited with $${req.body.amount} USD after verification.`,
            subject: 'Pending Deposit Alert',
            adminMessage: `hello ARMANI, a user with the name.${user.firstname}, just deposited $${req.body.amount} USD into to your ${req.body.method} wallet. please confirm deposit and credit.`,
            adminSubject:'Deposit Alert'
      })
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
  })
  if (user) {
    if( user.password !== req.body.password){
      return res.json({ status: 404, })
    }
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
  
  else {
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
    if (user.capital >= req.body.amount) {
      const now = new Date()
      switch (req.body.duration) {
        case '20 days':
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
                    profit: money,
                    ended:259200000,
                    started:now.getTime(),
                    periodicProfit:0
                  },
                  transaction:{
                    type:'investment',
                    amount: req.body.amount,
                    date: now.toLocaleString(),
                    balance: user.funded,
                    id:crypto.randomBytes(32).toString("hex")
                  }
                }
              }
              )
          break;
        case '25 days':
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
                    profit: money,
                    ended:345600000,
                    started:now.getTime(),
                    periodicProfit:0
                  },
                  transaction:{
                    type:'investment',
                    amount: req.body.amount,
                    date: now.toLocaleString(),
                    balance: user.funded,
                    id:crypto.randomBytes(32).toString("hex")
                  }
                }
              }
              )
          break;
        case '30 days':
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
                    profit: money,
                    ended:604800000,
                    started:now.getTime(),
                    periodicProfit:0
                  },
                  transaction:{
                    type:'investment',
                    amount: req.body.amount,
                    date: now.toLocaleString(),
                    balance: user.funded,
                    id:crypto.randomBytes(32).toString("hex")
                  }
                }
              }
              )
          break;
        case '35 days':
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
                    profit: money,
                    ended:691200000,
                    started:now.getTime(),
                    periodicProfit:0
                  },
                  transaction:{
                    type:'investment',
                    amount: req.body.amount,
                    date: now.toLocaleString(),
                    balance: user.funded,
                    id:crypto.randomBytes(32).toString("hex")
                  }
                }
              }
              )
          break;
        case '40 days':
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
                    profit: money,
                    ended:864000000,
                    started:now.getTime(),
                    periodicProfit:0
                  },
                  transaction:{
                    type:'investment',
                    amount: req.body.amount,
                    date: now.toLocaleString(),
                    balance: user.funded,
                    id:crypto.randomBytes(32).toString("hex")
                  }
                }
              }
              )
          break;
        case '42 days':
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
                    profit: money,
                    ended:103680000,
                    started:now.getTime(),
                    periodicProfit:0
                  },
                  transaction:{
                    type:'investment',
                    amount: req.body.amount,
                    date: now.toLocaleString(),
                    balance: user.funded,
                    id:crypto.randomBytes(32).toString("hex")
                  }
                }
              }
              )
          break;
      }
      
      await User.updateOne(
        { email: email },
        {
          $set: {capital : user.capital - req.body.amount, totalprofit : user.totalprofit + money ,withdrawDuration: now.getTime()}
        }
      )
      res.json({ status: 'ok', amount: req.body.amount })
    } else {
      res.json({
        message: 'Insufficient capital!',
        status:400
      })
    }
  } catch (error) {
    return res.json({ status: 500 , error: error})
  }
})


const change = (users, now) => {
  users.forEach((user) => {
    // try {
    //   async()=>{
    //    await User.updateOne({}, {
    //      $set: {
    //        upline: '',
    //        username: user.firstname
    //     }
    //   })
    //   }
    //   console.log('model updated successfully')
    // } catch (error) {
    //   console.log(error)
    // }
     
    user.investment.map(async (invest) => {
      if (isNaN(invest.started)) {
        console.log('investment is no a number')
        res.json({message:'investment is no a number'})
        return
      }
      if (user.investment === []) {
        console.log('investment is not empty array')
        res.json({message:'investment is an empty array'})
        return
      }
      if (now - invest.started >= invest.ended) {
        console.log('investment completed')
        res.json({message:'investment completed'})
        return
      }
      if (isNaN(invest.profit)) {
        console.log('investment profit is not a number')
        res.json({message:'investment profit is not a number'})
        return
      }
      if (invest.profit <= 14) {
        try {
            await User.updateOne(
              { email: user.email },
              {
                $set: {
                  funded: user.funded + Math.round(11 / 100 * invest.profit),
                  periodicProfit: user.periodicProfit + Math.round(11 / 100 * invest.profit),
                  capital: user.capital + Math.round(11 / 100 * invest.profit),
                }
              }
          )
          console.log('investment increased by 11%')
        } catch (error) {
          console.log(error)
        }
        
      }
      if (invest.profit > 14 && invest.profit <= 40) {
        try {
              await User.updateOne(
                { email: user.email },
                {
                  $set:{
                    funded:user.funded + Math.round(6/100 * invest.profit),
                    periodicProfit:user.periodicProfit + Math.round(6/100 * invest.profit),
                    capital:user.capital + Math.round(6/100 * invest.profit),
                  }
                }
          )
             console.log('investment increased by 6%')
        } catch (error) {
             console.log(error)
        }
         
        }
      else {
        
        try {
          await User.updateOne(
            { email: user.email },
            {
              $set:{
                funded:user.funded + Math.round(4.5/100 * invest.profit),
                periodicProfit:user.periodicProfit + Math.round(4.5/100 * invest.profit),
                capital:user.capital + Math.round(4.5/100 * invest.profit),
              }
            }
          )
          console.log('investment increased by 4.5%')
        } catch (error) {
          console.log(error)
        }
          
        }
 })
})
} 
app.get('/api/cron', async (req, res) => {
  try {
      const users = (await User.find()) ?? []
      const now = new Date().getTime()
      change(users, now)
      return res.json({status:200})
  } catch (error) {
    console.log(error)
    return res.json({status:500, message:'error! timeout'})
  }
})

// setInterval(async () => {
//   // mongoose.connect(process.env.ATLAS_URI)
//   const users = (await User.find()) ?? []
//   const now = new Date().getTime()
//   change(users, now)
// }, 10000)

app.post('/api/getWithdrawInfo', async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
    })
    if(user){
    const userAmount = user.withdraw[user.withdraw.length - 1].amount
    return res.json({ status: 'ok', amount: userAmount})
    }
  }
  catch(err) {
      return res.json({ status: 'error', user: false })
    }
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`)
})

