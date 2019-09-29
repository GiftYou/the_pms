var express = require('express');
var router = express.Router();

const {pool, isLogged} = require('../helpers/login');

router.get('/list', isLogged, function(req, res, next) {
    let sql = 'SELECT * FROM users WHERE userid=$1';
    pool.query(sql, [req.session.user.userid] , (err, data) => {
      let email = data.rows[0];
      console.log(email);
      
      res.render("profile/list", {data: email});
    })
  })

  module.exports = router;