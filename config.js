var config = {}

// Token加密秘钥
config.secret_key = 'ch6ZSqPy6jqBVgtZZ5NKCZsTu3Cshfpy'
// token 中 json对象属性检测
config.token_needs = ['username', 'room', 'role']
// 向客户端推送消息时，发给首个连接还是末位连接  选项：first | last
config.emitType = 'first'

module.exports = config;
