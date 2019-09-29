const { Pool } = require('pg');

const pool = new Pool ({
    user: 'postgres',
  host: 'localhost',
  database: 'pms',
  password: 'learnpgadmin',
  port: 5432,
})

module.exports = {
  isLogged : (req, res, next) => {
    if(req.session.user){
      next();
    }else{
      res.redirect('/login')
    }
  },
  pool : pool
}