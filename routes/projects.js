var express = require('express');
var router = express.Router();

const {pool, isLogged} = require('../helpers/login');

router.get('/list', isLogged, function(req, res, next){
    let arr = [];
    let flek = false;
    if(req.query.checkproname != undefined){
      flek = true;
      arr.push(`name LIKE '%${req.query.projectname}%' `);
    }if(req.query.checkproid != undefined){
      flek = true;
      arr.push(`id = ${req.query.projectid}`)
    }if(req.query.checkpromember != undefined){
      flek = true;
      arr.push(`firstname = '${req.query.projectmember}'`)
    }
    let sqlProjects = 'SELECT DISTINCT projects.projectid, projects.name, users.firstname, users.userid FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid'
    if(flek){
      sqlProjects += " WHERE " + arr.join(" AND ")
    }
    
    pool.query(sqlProjects , (err, dataProjects) => {
      // console.log(typeof(dataProjects.rows[0].userid)); number
      
      res.render("projects/list", {title: 'Projects', data: dataProjects.rows})
    })
  })

  router.get('/add',isLogged, function (req, res, next) {

    pool.query(`SELECT firstname, lastname FROM users ORDER BY userid`, (err, response) => {
        function fullName(getname) {
            let fullname = [getname.firstname, getname.lastname].join(" ")
            return fullname
        }
        const pro = response.rows.map(fullName)
        console.log(pro);
        
        res.render('projects/add', {
            title: 'Projects', pro,
        })
    })
})

router.post('/add', function (req, res, next) {
  let trynew = `SELECT nextval('projects_projectid_seq') AS nextid`
  pool.query(trynew, (err, data) => {
      const projectid = data.rows[0].nextid

      trynew = `INSERT INTO projects(projectid, name) VALUES ('${projectid}','${req.body.addproject}')`

      pool.query(trynew, (err, response) => {
          if (err) return res.send(err)

          if (typeof req.body.membersck == 'string') {
              trynew = `INSERT INTO members (projectid, userid) VALUES (${projectid}, ${req.body.membersck})`
          } else {
              trynew = `INSERT INTO members (projectid, userid) VALUES ${req.body.membersck.map((item) => `(${projectid},${item})`).join(',')}`
          }
          pool.query(trynew, (err) => {
              pool.query(`UPDATE members SET role = subquery.position FROM (SELECT userid, position FROM users) AS subquery WHERE members.userid = subquery.userid`)
              if (err) return res.send(err)
              res.redirect('/projects/list')
          })
      })
  })
})

router.get('/edit/:id',isLogged, (req, res) => {


  pool.query(`SELECT * FROM users ORDER BY userid`, (err, response) => {

      function fullName(getname) {
          let fullname = [getname.firstname, getname.lastname].join(" ")
          return fullname
      }
      let editPro = response.rows.map(fullName)
      // console.log(typeof(editPro[0]));
      
      pool.query(`SELECT * FROM projects WHERE projectid = ${req.params.id}`, (err, response2) => {
          let projectname = response2.rows[0]
          console.log(response2.rows[0]);

          res.render('projects/edit', {
              title: 'Edit Projects', editPro, projectname,user: req.session.user, response: response.rows
          })
      })
  })
})

router.post('/edit/:id',isLogged, (req, res) => {
  let editId = req.params.id

let postEdit = `UPDATE projects SET projectid = ${editId}, userid = '${req.body.editproject}'`
// req.body.editmemberproject.map((item) => (editId,item)).join(',');

// let arr = [4];
// console.log(arr.join(", "));
// console.log(req.body.editmemberproject.map((item) => `(${editId},${item})`).join(','));
// console.log(req.body.editmemberproject);

//string, object, undifined
// console.log(typeof(req.body.editmemberproject));

// res.redirect('/projects/list')

pool.query(postEdit, (err, response) => {

    pool.query(`DELETE FROM x WHERE projectid = ${editId}`, (err, raw) => {

        if (typeof req.body.editmemberproject == 'string') {
            postEdit = `INSERT INTO members (projectid, userid) VALUES (${editId}, ${req.body.editmemberproject})`
        } else {
            postEdit = `INSERT INTO members (projectid, userid) VALUES ${req.body.editmemberproject.map((item) => `(${editId},${item})`).join(',')}`
        }

        pool.query(postEdit, (err) => {
            pool.query(`UPDATE members SET role = subquery.position FROM (SELECT userid, position FROM users) AS subquery WHERE members.userid = subquery.userid`)
            if (err) return res.send(err)
            res.redirect('/projects/list')
        })
    })
})

})


// router.post('/edit/:id',isLogged, (req, res) => {
//   let editId = req.params.id
//   let postEdit = `UPDATE projects SET projectid = ${editId}, userid = ${req.body.projectid}`

//   // console.log(req.body.editproject);
//   // console.log(editId);

//   console.log(req.body.editmemberproject);
//   console.log(req.body.projectid);
  
  
//   res.redirect('/projects/list')

//   // pool.query(postEdit, (err, response) => {

//   //     pool.query(`DELETE FROM members WHERE projectid = ${editId}`, (err, raw) => {

//   //         if (typeof req.body.editmemberproject == 'string') {
//   //             postEdit = `INSERT INTO members (projectid, userid) VALUES (${editId}, ${req.body.editmemberproject})`
//   //         } else {
//   //             postEdit = `INSERT INTO members (projectid, userid) VALUES ${req.body.editmemberproject.map((item) => `(${editId},${item})`).join(',')}`
//   //         }

//   //         pool.query(postEdit, (err) => {
//   //             pool.query(`UPDATE members SET role = subquery.position FROM (SELECT userid, position FROM users) AS subquery WHERE members.userid = subquery.userid`)
//   //             if (err) return res.send(err)
//   //             res.redirect('/projects/list')
//   //         })
//   //     })
//   // })

// })

  module.exports = router;