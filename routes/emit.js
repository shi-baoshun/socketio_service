var express = require('express');
var router = express.Router();
var path = require('path');

/* GET emit page. */
router.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname, '../views/emit.html'));
});

module.exports = router;
