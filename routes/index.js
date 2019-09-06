var express = require('express');
var router = express.Router();
const filter = { password: 0, __v: 0 }
const md5 = require('blueimp-md5')
const { UserModel, ChatModel } = require('../db/models')
/* GET home page. */
// router.get('/', function(req, res,next) {
//   res.render('index', { title: 'Express' });
// });

// router.post('/register',function(req,res){
//   const {username,password}= req.body
//   res.send({code:1,msg:'ok',username,password})
// })

router.post('/register', function (req, res) {
  const { username, password, type } = req.body
  //查询是否存在
  UserModel.findOne({ username }, (err, userDoc) => {
    if (userDoc) {
      res.send({ code: 1, msg: '此用户已存在' })
    } else {
      new UserModel({ username, password: md5(password), type }).save(function (err, userDoc) {

        res.cookie('userid', userDoc._id, { maxAge: 1000 * 60 * 60 })
        const data = { username, type, _id: userDoc._id }
        res.send({ code: 0, msg: '注册成功', data: data })
      })
    }
  })
})

router.post('/login', (req, res) => {
  const { username, password } = req.body
  UserModel.findOne({ username, password: md5(password) }, filter, function (err, user) {
    if (user) {
      res.cookie('userid', user._id, { maxAge: 1000 * 60 * 60 })
      res.send({ code: 0, data: user })
    } else {
      res.send({ code: 1, msg: '用户或者密码不正确' })
    }
  })
})

router.post('/update', function (req, res) {
  const user = req.body
  const userid = req.cookies.userid
  if (!userid) {
    res.send({
      code: 1, msg: "请先登录"
    })
    return
  } else {
    UserModel.findByIdAndUpdate({ _id: userid }, user, (err, oldUser) => {
      if (!oldUser) {
        res.clearCookie('userid')
        res.send({ code: 1, msg: '请先登录' })
      } else {
        const { _id, username, type } = oldUser
        const data = Object.assign(user, { _id, username, type })
        res.send({ code: 0, data })
      }
    })
  }
})

router.get('/user', function (req, res) {
  const userid = req.cookies.userid
  if (!userid) {
    res.send({ code: 1, msg: '请先登录' })
  } else {
    UserModel.findOne({ _id: userid }, filter, (err, user) => {
      res.send({ code: 0, data: user })
    })
  }
})

router.get('/userList', function (req, res) {
  const { type } = req.query
  UserModel.find({ type }, filter, function (err, users) {
    res.send({ code: 0, data: users })
  })
})

router.get('/msglist', function (req, res) {
  const userid = req.cookies.userid

  UserModel.find(function (err, userDocs) {

    const users = {} 
    userDocs.forEach(doc => {
      users[doc._id] = { username: doc.username, avatar: doc.avatar }
    }) 

    ChatModel.find({ '$or': [{ from: userid }, { to: userid }] }, filter, function (err, chatMsgs) {
      // 返回包含所有用户和当前用户相关的所有聊天消息的数据
      res.send({ code: 0, data: { users, chatMsgs } })
    })
  }) 
})

router.post('/readmsg', function (req, res) { // 得到请求中的 from 和 to
  const from = req.body.from
  const to = req.cookies.userid


  ChatModel.update({ from, to, read: false }, { read: true }, { multi: true }, function (err, doc) {
    console.log('/readmsg', doc)
    res.send({ code: 0, data: doc.nModified }) // 更新的数量 })
  })
})
  module.exports = router;
