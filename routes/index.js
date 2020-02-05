var express = require('express');
var router = express.Router();

const {pool, isLogged} = require('../helpers/login');

/* GET home page. */

router.get('/', isLogged, function (req, res, next) {
  
  res.render('index')
})

router.get('/login', function(req, res, next) {
  res.render('index', { title: 'datas' });
});

router.post('/login', function (req, res) {
  let sql = "SELECT * FROM users WHERE email=$1 AND password=$2"
  pool.query(sql , [req.body.Username, req.body.Password] , (err, data) => {
    if (data == undefined || data.rows.length == 0) {
      console.log("isi yang bener");

      
      res.redirect("login");
    } else {

      req.session.user = data.rows[0]
      
      res.redirect("/projects/list");
    }
  })
})

router.get('/logout', function (req, res, next) {
  req.session.destroy(function (err) {
    
    res.redirect('/login')
  })
})

router.post('/update', function (req, res) {
  let check = false;
  let Result = [];

  if(req.body.Password){
    Result.push(`password='${req.body.Password}'`);
  }if(req.body.position){
    check = true;
    Result.push(`roles='${req.body.position}'`)
  }if(Boolean(req.body.working_status) != undefined){
    check = true;
    Result.push(`"IsFulltime"=${Boolean(req.body.working_status)}`)
  }

  let sql = `UPDATE users`;
  if(check){
    sql+= ` SET ${Result.join(", ")} WHERE userid=$1`;
  }
  
  pool.query(sql,[req.session.user.userid], (err, response) => {
    res.redirect('/');
  })

  console.log(req.body.Password);
  console.log(req.body.position);
  console.log(Boolean(req.body.working_status));
  
  
  
})

module.exports = router;
