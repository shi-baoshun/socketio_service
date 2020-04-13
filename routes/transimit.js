var express = require('express');
var router = express.Router();
var path = require('path');
// var io = require('socket.io-client');
var jwt = require('jsonwebtoken')
var config = require('../config')

/* GET transimit page. */
router.post('/', function (req, res, next) {

    console.log(global.online_users_dict)
    var data = req.body
    console.log(data)
    // 验证参数完整性
    var needs = ['token', 'message']
    var correct = true
    for (var index in needs) {
        if (needs[index] in data === false) {
            res.status(200).json({
                'msg': 'Post参数缺失，请检查!',
                'code': 400
            })
            return
        }
    }
    var room = undefined
    var username = undefined
    // 验证 token 签名
    jwt.verify(data.token, config.secret_key, (err, info) => {
        if (err) {
            return res.status(200).json({
                'msg': `Token认证失败！[${err.name}: ${err.message}]`,
                'code': 400
            })
        } else {
            // 验证 token 解析后的内容是否完整
            var needs = config.token_needs
            var is_valid = true
            for (index in needs) {
                if (needs[index] in info === false) {
                    is_valid = false
                    break
                }
            }
            if(is_valid === false){
                return res.status(200).json({
                    'msg': `Token信息缺失！`,
                    'code': 400
                })
            }
            username = info.username
            room = info.room
        }
    })
    // 校验待发送的房间是否存在
    if(room in global.online_users_dict === false){
        return res.status(200).json({
            'msg': `房间[${room}不存在！]`,
            'code': 400
        })
    }
    // 遍历发送消息
    var room_users = global.online_users_dict[room]
    for (var name in room_users) {
        // 不发给自己
        if (name !== username) {
            let sids_arr = room_users[name]
            let sid = config.emitType === 'first' ? sids_arr[0] : sids_arr[sids_arr.length - 1]
            console.log(sids_arr, sid)
            global.io_obj.of('/').to(sid).emit('message', data.message)
        }
    }
    return res.status(200).json({
        'msg': `发送成功！`,
        'code': 200
    })

});

module.exports = router;