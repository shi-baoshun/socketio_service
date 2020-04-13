var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken')
var config = require('../config')

/* GET 获取token */
router.get('/', function(req, res, next) {
  var params = req.query
  console.log(params)
  
  let token = jwt.sign(
    // 用户信息
    {
      username: params.username,
      role: params.role, // sender、receiver、admin
      room: params.room
    },
    // token秘钥
    config.secret_key,
    // 过期时间(秒)
    {
      expiresIn: 60 * 5
    }
  )
  res.send(token);
});

module.exports = router;
