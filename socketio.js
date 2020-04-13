/* 
  封装socket.io,为了获取server以便监听
  */
var socketio = {};
var socket_io = require('socket.io');
var socketioJwt = require('socketio-jwt');
var format = require('string-format');
var config = require('./config')

/*
{
  "room1": {
    { "user1": [
                "m7Yp2BL7L5WnjAFsAAAI1",
                "m7Yp2BL7L5WnjAFsAAAI2"
               ],
      "user2": ["m7Yp2BL7L5WnjAFsAAAB"]
    }
  },
  "room2": {
    { "user1": ["m7Yp2BL7L5WnjAFsAAAI"],
      "user2": ["m7Yp2BL7L5WnjAFsAAAB"]
    }
  }
}
*/

//获取io  
socketio.getSocketio = function (server) {

  // 监听 server
  var io = socket_io.listen(server);
  console.log("聊天室已经准备就绪！")

  // 中间件：对token在握手阶段进行鉴权
  io.use(socketioJwt.authorize({
    secret: config.secret_key,
    handshake: true
  }));

  // 连接事件
  io.on('connection', (socket) => {
    console.log("some one is connecting...")
    // 
    // 为进入连接的用户，根据房间名称连接
    assign_room(socket)

    // 客户端主动断开时执行
    client_disconnect(socket)

    // 消息广播
    message_broadcast(socket)
    // console.log({
    //   "当前链接数量": io.eio.clientsCount,
    //   "当前所有连接": socket.nsp.connected,
    //   "当前所有房间": socket.adapter.rooms
    // })
  });
  return io
};
// ----------【检测Token信息完整性】----------
function token_validate(socket) {
  var userInfo = socket.decoded_token
  console.log('-----用户信息如下-----:\n', userInfo)
  var needs = config.token_needs
  var is_valid = true
  for (index in needs) {
    if (needs[index] in userInfo === false) {
      is_valid = false
      break
    }
  }
  return is_valid
}

// ----------【在线用户信息】-------------
function print_online_users() {
  console.log(`-----当前在线用户信息-----:\n`, global.online_users_dict)
}
// ----------【获取房间信息】-------------
function get_room_obj(room, socket) {
  var room_exist = room in socket.adapter.rooms
  console.log(`${room} 是否存在:`, room_exist)
  var roomObj = null
  if (room_exist) {
    roomObj = Reflect.get(socket.adapter.rooms, room)
  }
  console.log(`房间[${room}]信息:\n`, roomObj)
  return roomObj
}
// ----------【为连接用户分配房间】------------
function assign_room(socket) {

  // 检测Token信息完整性
  let token_is_valid = token_validate(socket)
  if (token_is_valid === false) {
    console.log(`Token信息不完整，已禁止连接!`)
    socket.disconnect(true)
    return
  }
  // 获取token信息
  var userinfo = socket.decoded_token
  var room = userinfo.room
  var username = userinfo.username
  // 显示在线用户信息
  print_online_users()
  // 获取房间信息
  var roomObj = get_room_obj(room, socket)
  if (roomObj) {
    var sid = socket.id
    // 该sid是否已经连接
    var sid_online = false
    if (username in global.online_users_dict[room]) {
      let sid_arr = global.online_users_dict[room][username]
      sid_online = sid_arr.indexOf(sid) >= 0
    }
    // 再根据 roomObj 对象双重检测
    var sid_in_room = sid in roomObj.sockets && roomObj.sockets[sid]

    if (sid_online && sid_in_room) {
      console.log(`${username}已经在房间[${room}]中创建socket[${sid}]，不能重复创建！`)
      socket.emit('CustomError', { message: `${username}已经在房间[${room}]中创建socket[${sid}]，不能重复创建！`, code: "repeated_sid", type: "RepeatedSidError" })
      socket.disconnect(true)
      return
    }
  }
  // 允许同个用户，连接多个。但是消息发送仅发送给单个(首个或者末尾)
  socket.join(room);
  // 首个进入该房间的人，会自动创建房间
  if (room in global.online_users_dict === false) {
    global.online_users_dict[room] = {}
  }
  // 用户的首次连接创建数组
  if (username in global.online_users_dict[room] === false){
    global.online_users_dict[room][username] = []
  }
  // 将sid添加到 array 末尾
  global.online_users_dict[room][username].push(socket.id)
  console.log(`${username}通过${socket.id}加入房间[${room}]成功！当前房间人数${Object.keys(global.online_users_dict[room]).length}`)
}

// ----------【客户端主动断开】------------
function client_disconnect(socket) {
  socket.on('disconnect', (reason) => {
    // 根据sid删除在线用户列表
    var username = socket.decoded_token.username
    var room = socket.decoded_token.room
    var sid = socket.id
    console.log(`用户[${username}]的[${socket.id}]已经断开连接...原因:\n${reason}`)
    try {

      let forDeletion = [socket.id]
      // 删除列表中所有 等于 socket.id 的项
      global.online_users_dict[room][username] = global.online_users_dict[room][username].filter(item => !forDeletion.includes(item))

    } catch (error) {
      console.log(`用户[${username}]-Sid[${socket.id}]断开连接执行下线操作时错误!`, error)
    }
    print_online_users()
  });
}

// ----------【消息广播】------------
function message_broadcast(socket) {
  socket.on('broadcast', (data) => {
    console.log(data)
    // 鉴别Token信息
    let token_is_valid = token_validate(socket)
    if (token_is_valid === false) {
      console.log("Token信息不完整，无法执行广播任务！")
      socket.emit('CustomError', { message: "Token信息不完整", code: "incomplete_token", type: "TokenError" })
      return
    }
    // 鉴别权限
    var userInfo = socket.decoded_token
    var role = userInfo.role
    var username = userInfo.username
    var room = userInfo.room
    if (role !== 'admin' && role !== 'sender') {
      socket.emit('CustomError', { message: "权限不足，无法执行广播!", code: "perimission_denied", type: "PermissionError" })
      console.log(`用户[${username}]权限[${role}]不足，无法执行广播任务！`)
      return
    }
    // 向指定的房间--> 发送广播
    console.log(`用户[${username}]权限[${role}]满足，发送广播:`, data)
    // 遍历发送消息
    var room_users = global.online_users_dict[room]
    for(var name in room_users){
      // 不发给自己
      if (name !== username){
        let sids_arr = room_users[name]
        let sid = config.emitType === 'first' ? sids_arr[0] : sids_arr[sids_arr.length -1]
        console.log(sids_arr, sid)
        socket.to(sid).emit('message', data)
      }
    }
    // socket.to(room).broadcast.emit('message', data)

  });
}
module.exports = socketio; 