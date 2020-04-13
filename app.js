var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser')

// 引入路由
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var emitRouter = require('./routes/emit');
var tokenRouter = require('./routes/token');
var clientRouter = require('./routes/client');
var transimitRouter = require('./routes/transimit')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// 中间件
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

// 路由分发
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/emit', emitRouter);
app.use('/token', tokenRouter);
app.use('/client', clientRouter);
app.use('/transimit', transimitRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
