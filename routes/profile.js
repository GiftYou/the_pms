var express = require('express');
var router = express.Router();

const {pool, isLogged} = require('../helpers/login');

router.get('/list', isLogged, function(req, res, next) {
    let sql = 'SELECT * FROM users WHERE userid=$1';
    pool.query(sql, [req.session.user.userid] , (err, data) => {
      let email = data.rows[0];
      console.log(email);
      
      res.render("profile/list", {pro: email, user: req.session.user});
    })
  })

router.post('/list', (req, res, next) => {
  let filter = false
  let filterpass = req.body.password, filterposition = req.body.position, filterstatus = req.body.working_status;
  let filterResult = []
  
  let choosepro = `SELECT * FROM users WHERE userid='${req.session.user.userid}'`
  pool.query(choosepro, (err, rows) => {
      if (filterpass) {
          filterResult.push(`password='${filterpass}'`)
      }
      if (filterposition) {
          filter = true
          filterResult.push(`position='${filterposition}'`)
      }
      if (filterstatus) {
          filter = true
          filterResult.push(`jobtype='${filterstatus}'`)
          console.log(filterstatus);

      }
      let allFilter = `UPDATE users`
      if (filter) {
          allFilter += ` SET ${filterResult.join(", ")} WHERE userid='${req.session.user.userid}'`
      }
      pool.query(allFilter, (err, response) => {
          res.redirect('/profile/list')

      })

  })
});

  module.exports = router;