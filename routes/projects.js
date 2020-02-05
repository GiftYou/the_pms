var express = require('express');
var router = express.Router();

var moment = require('moment')

const {pool, isLogged} = require('../helpers/login');

router.get('/list', isLogged, function(req, res, next){
    let arr = [];
    let flek = false;

    const page = req.query.page || 1;
    const limit = 2;
    const offset = (page - 1) * limit
    const url = (req.url == '/list') ? `/list?page=1` : req.url
    
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
    
    let sql = `SELECT COUNT(id) as total FROM (SELECT DISTINCT projects.projectid AS id FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid`

    if (flek) {
      sql += ` WHERE ${arr.join(" AND ")}`
  }
    sql += `) AS project_member`

    pool.query(sql, (err, count) => {

      const total = count.rows[0].total
      const pages = Math.ceil(total / limit)
      
      let sqlProjects = 'SELECT DISTINCT projects.projectid, projects.name FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid'
    if(flek){
      sqlProjects += " WHERE " + arr.join(" AND ")
    }

    sqlProjects += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`
    let newsql = `SELECT DISTINCT projects.projectid FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid`
    if (flek) {
        newsql += ` WHERE ${arr.join(" AND ")}`
    }
    newsql += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`

    let processing = `SELECT projects.projectid, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM members INNER JOIN users ON users.userid = members.userid INNER JOIN projects ON projects.projectid = members.projectid
            WHERE projects.projectid IN (${newsql})`
    
    pool.query(sqlProjects , (err, projectData) => {
      if(err) {
        console.log(err);
        
        return res.send(err);
      }
      
      pool.query(processing , (err, dataProjects) => {
        projectData.rows.map(project => {
          project.members = dataProjects.rows.filter(member => { return member.projectid == project.projectid }).map(item => item.fullname)
      })
        pool.query(`SELECT projectoptions FROM users WHERE userid = ${req.session.user.userid}` , (err, rowss) => {

          pool.query(`SELECT CONCAT (firstname,' ',lastname) AS fullname FROM users`, (err, dataProjects) => {
            console.log(req.session.user);
            
            res.render("projects/list", {title: 'Projects', data: projectData.rows,
              user: req.session.user, pagination: {
                page, pages, total, url
            }, projectoptions: rowss.rows[0].projectoptions})
          })
        })
      })
    })
    })
  })

  router.post('/projectoptions', isLogged, (req, res) => {

    let sql = `UPDATE users SET projectoptions = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`

    pool.query(sql, (err, rows) => {

        res.redirect('/projects/list')
    })

    // console.log(JSON.stringify(req.body));
    
    //     res.redirect('/projects/list')
})

  router.get('/add',isLogged, function (req, res, next) {

    pool.query(`SELECT firstname, lastname FROM users ORDER BY userid`, (err, response) => {
        function fullName(getname) {
            let fullname = [getname.firstname, getname.lastname].join(" ")
            return fullname
        }
        const pro = response.rows.map(fullName)
        
        res.render('projects/add', {
            title: 'Projects', pro
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


  pool.query(`SELECT * FROM users;
  `, (err, response) => {

    function fullName(getname) {
        let item = {fullname:`${getname.firstname} ${getname.lastname}`, userid: getname.userid}
        return item
    }
    let editPro = response.rows.map(fullName)
    pool.query(`SELECT DISTINCT(users.userid),users.firstname,members.projectid FROM users INNER JOIN members ON users.userid = members.userid WHERE members.projectid = ${req.params.id};
    ` ,(err, response3) => {
        
        function fullProjects(getproject) {
          return getproject.userid
        }

      pool.query(`SELECT * FROM projects WHERE projectid = ${req.params.id}`, (err, response2) => {
        let projectname = response2.rows[0]
        let projectmember = response3.rows.map(fullProjects);
        console.log(projectmember, 'projectmember');
        console.log(editPro, 'editPro');

        res.render('projects/edit', {
            title: 'Edit Projects', editPro, projectname,user: req.session.user, response: response.rows, projectmember
        })
      })
    })
    
  })
})

//      post edit

router.post('/edit/:id',isLogged, (req, res) => {
  let editId = req.params.id

let postEdit = `UPDATE projects SET name = ${req.body.editproject}, projectid = '${editId}'`

  pool.query(postEdit, (err, response) => {

      pool.query(`DELETE FROM members WHERE projectid = ${editId}`, (err, raw) => {

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

router.get('/delete/:id',isLogged, (req, res) => {
  let editId = req.params.id;
  pool.query(`DELETE FROM members WHERE projectid = ${editId}`, (err, resdel) => {
    pool.query(`DELETE FROM projects WHERE projectid = ${editId}`, (err, resdel2) => {
        console.log(resdel2);
        if (err) {
            console.log(err);
        } else {
            res.redirect(`/projects/list`)
        }
    })
})
})

router.get('/overview/:id',isLogged, function (req, res, next) {
  let nav1 = 2
  let keyid = req.params.id

  let showmember = `SELECT firstname, lastname FROM members INNER JOIN users ON members.userid = users.userid WHERE projectid = ${keyid} ORDER BY users.userid`

  pool.query(showmember, (err, response) => {
      let showedmember = response.rows
      //issue tracking
      //bug
      let issueBug = `SELECT COUNT(*) FROM issues WHERE projectid = ${keyid} AND tracker = 'bug'`
      pool.query(issueBug, (err, resBug) => {
          let countBug = resBug.rows[0].count
          let issueBugClosed = `SELECT COUNT(*) FROM issues WHERE projectid = ${keyid} AND tracker = 'Bug' AND status != 'closed'`
          pool.query(issueBugClosed, (err, resBug2) => {
              let countBug2 = resBug2.rows[0].count
              //feature
              let issueFeature = `SELECT COUNT(*) FROM issues WHERE projectid = ${keyid} AND tracker = 'Feature'`
              pool.query(issueFeature, (err, resFeature) => {
                  let countFeat = resFeature.rows[0].count
                  let issueFeatureClosed = `SELECT COUNT(*) FROM issues WHERE projectid = ${keyid} AND tracker = 'Feature' AND status != 'closed'`
                  pool.query(issueFeatureClosed, (err, resFeature2) => {
                      let countFeat2 = resFeature2.rows[0].count
                      //support
                      let issueSupp = `SELECT COUNT(*) FROM issues WHERE projectid = ${keyid} AND tracker = 'Support'`
                      pool.query(issueSupp, (err, resSupp) => {
                          let countSupp = resSupp.rows[0].count
                          let issueSuppClosed = `SELECT COUNT(*) FROM issues WHERE projectid = ${keyid} AND tracker = 'Support' AND status != 'closed'`
                          pool.query(issueSuppClosed, (err, resSupp2) => {
                              let countSupp2 = resSupp2.rows[0].count

                              res.render('projects/overview', { title: 'Login', nav1, keyid, showedmember,user: req.session.user, countBug, countBug2, countFeat, countFeat2, countSupp, countSupp2 })
                          })
                      })
                  })
              })
          })
      })
  })
})

router.get('/members/list/:id',isLogged, function (req, res, next) {
  let nav1 = 3
  let keyid = req.params.id

  const web = (req.url == `/members/list/${keyid}`) ? `/members/list/${keyid}?page=1` : req.url

  let flagmember = false
  let filterMember = []
  //form
  let idquerymem = Number(req.query.halmemberid), namequerymem = req.query.halmembername
  //checkbox
  let cm1 = req.query.checkmem1, cm2 = req.query.checkmem2, cm3 = req.query.checkmem3;

  let page = req.query.page || 1;
  let limit = 1;
  let offset = (page - 1) * limit

  if (cm1 && idquerymem) {
      flagmember = true;
      filterMember.push(`users.userid = ${idquerymem}`)
  }
  if (cm2 && namequerymem) {
      flagmember = true;
      filterMember.push(`firstname ILIKE '%${namequerymem}%' `)
  }
  if (cm3 && req.query.positionmem) {
      flagmember = true;
      filterMember.push(`role = '${req.query.positionmem}' `)
  }

  let sql = `SELECT COUNT(*) as total FROM members INNER JOIN users ON users.userid = members.userid WHERE projectid = ${keyid}`
  if (flagmember) {
      sql += ` AND ${filterMember.join(" AND ")}`
  }


  pool.query(sql, (err, response0) => {
      let total = response0.rows[0].total
      let pages = Math.ceil(total / limit)


      sql = `SELECT * FROM members INNER JOIN users ON users.userid = members.userid INNER JOIN projects ON projects.projectid = members.projectid WHERE members.projectid = ${keyid}`
      if (flagmember) {
          sql += ` AND ${filterMember.join(" AND ")}`
      }
      sql += ` ORDER BY users.userid LIMIT ${limit} OFFSET ${offset}`

      pool.query(sql, (err, response1) => {

          let listable = response1.rows

          let sqlOption = `SELECT memberoptions FROM users WHERE userid = ${req.session.user.userid}`
          pool.query(sqlOption, (err, rowss) => {


              res.render('projects/members/list', {
                  title: 'Login',nav1, keyid,user: req.session.user, listable, query: req.query, memberoption: rowss.rows[0].memberoptions, pagination: {
                      page, pages, web
                  }
              })
          })
      })
  })
})

router.post('/members/list/:id', (req, res) => {

  let sql = `UPDATE users SET memberoptions = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`

  pool.query(sql, (err, rows) => {
      res.redirect(`/projects/members/list/${req.params.id}`)
  })
})

router.get('/members/list/edit/:id/:userid',isLogged, (req, res) => {

  let nav1 = 3
  let keyid = Number(req.params.id)
  let userkeyid = req.params.userid

  pool.query(`SELECT users.userid, role, firstname, lastname FROM members INNER JOIN users ON users.userid = members.userid INNER JOIN projects ON members.projectid = projects.projectid WHERE members.projectid = ${keyid} AND users.userid = ${userkeyid}`, (err, response) => {

      let memberedit = response.rows

      function fullMember(getmember) {
          var fullmember = [getmember.firstname, getmember.lastname].join(" ")
          return fullmember
      }
      let plusmember = response.rows.map(fullMember)

      res.render(`projects/members/edit`, {
          title: 'Projects', nav1,user: req.session.user, plusmember, keyid, memberedit, userkeyid
      })
  })
})

router.post('/members/list/edit/:id/:userid', (req, res, next) => {
  let memedit = req.body.memberPosition

  let editrole = `UPDATE members SET role = '${memedit}' WHERE userid = ${req.params.userid}`

  pool.query(editrole, (err, response) => {

      res.redirect(`/projects/members/list/${req.params.id}`)
  })
})

router.get('/issues/list/:id',isLogged, function (req, res, next) {
  let nav1 = 4
  let keyid = req.params.id

  const web1 = (req.url == `/issues/list/${keyid}`) ? `/issues/list/${keyid}?page=1` : req.url

  let flagissue = false
  let filterIssue = []
  //checkbox
  let ci1 = req.query.checkfilterissue1, ci2 = req.query.checkfilterissue2, ci3 = req.query.checkfilterissue3;
  //form
  let IdIssue = Number(req.query.halissueid), nameIssue = req.query.halissuename;

  let page = req.query.page || 1;
  let limit = 2;
  let offset = (page - 1) * limit;

  if (ci1 && IdIssue) {
      flagissue = true
      filterIssue.push(`issueid = ${IdIssue}`)
  }
  if (ci2 && nameIssue) {
      flagissue = true
      filterIssue.push(`subject ILIKE '%${nameIssue}%'`)
  }
  if (ci3 && req.query.halissuetracker) {
      flagissue = true
      filterIssue.push(`tracker = '${req.query.halissuetracker}'`)
  }

  let issuetable = `SELECT COUNT(*) as total FROM issues INNER JOIN users ON users.userid = assignee WHERE projectid = ${keyid}`
  if (flagissue) {
      issuetable += ` AND ${filterIssue.join(" AND ")}`
  }

  pool.query(issuetable, (err, resIssueFilter) => {
      let total = resIssueFilter.rows[0].total
      let pages = Math.ceil(total / limit)

      issuetable = `SELECT * from issues INNER JOIN projects ON projects.projectid = issues.projectid INNER JOIN users ON users.userid = issues.assignee WHERE issues.projectid = ${keyid}`
      if (flagissue) {
          issuetable += ` AND ${filterIssue.join(" AND ")}`
      }
      issuetable += ` ORDER BY issueid LIMIT ${limit} OFFSET ${offset}`
      
      
      pool.query(issuetable, (err, resIssue1) => {
          let issuesTableResult = resIssue1.rows
          pool.query(`SELECT issueoptions FROM users WHERE userid = ${req.session.user.userid}`, (err, rowss) => {
              res.render('projects/issues/list', {
                  title: 'Login', nav1, keyid, query: req.query, issuesTableResult,moment, issueoptions: rowss.rows[0].issueoptions,user: req.session.user, pagination: {
                      page, pages, web1,
                  }
              })
          })
      })
  })
})

router.post('/issues/list/:id', (req, res) => {

  let sql = `UPDATE users SET issueoptions = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`

  pool.query(sql, (err, rows) => {

      res.redirect(`/projects/issues/list/${req.params.id}`)
  })
})

router.get('/issues/list/add/:id',isLogged, function (req, res, next) {
  let nav1 = 4
  let keyid = req.params.id

  pool.query(`SELECT * FROM members INNER JOIN users ON users.userid = members.userid INNER JOIN projects ON projects.projectid = members.projectid WHERE members.projectid = ${keyid}`, (err, responseAdd) => {

      let resultAdd = responseAdd.rows

      res.render(`projects/issues/add`, {
          title: 'Projects', nav1, keyid, user: req.session.user,resultAdd
      })
  })

})
router.post('/issues/list/add/:id', (req, res) => {
      let keyid = req.params.id

      let sampleFile = req.files.sampleFile;

      let uploadPath = `/home/saturnux/pms/pms-project/public/images/` + sampleFile.name;

      sampleFile.mv(uploadPath, function (err) {
          if (err) {
              return res.status(500).send(err);
          }
      })

      let insertAdd = `INSERT INTO issues(tracker, subject, description, status, priority, assignee,startdate, duedate, estimatedtime, done, files, parenttask, author, projectid, createddate) VALUES ('${req.body.trackerissue}', '${req.body.subjectform}', '${req.body.descriptionform}', '${req.body.statusIssue}', '${req.body.priorityissue}', ${req.body.assigneeform}, '${req.body.startdateform}', '${req.body.duedateform}', ${req.body.estimatedform}, ${req.body.doneform}, '${req.files.sampleFile.name}', ${req.body.parentadd}, ${req.body.authoradd}, ${req.params.id}, '${moment().format('YYYY-MM-DD hh:mm:ss')}')`
      
      pool.query(insertAdd, (err, responseAdd) => {

          pool.query(`INSERT INTO activity(title, description, author, time) VALUES (('${req.body.subjectform}''#${req.params.id}''${req.body.statusIssue}'), '${req.body.descriptionform}', ${req.body.authoradd}, '${moment().format('YYYY-MM-DD hh:mm:ss')}')`, (err, responseAct) => {

              res.redirect(`/projects/issues/list/${req.params.id}`)

          })
      })
      
  })

  router.get('/issues/list/edit/:id/:issueid',isLogged, function (req, res, next) {
    let nav1 = 4
    let keyid = req.params.id
    let userkeyid = req.params.issueid

    pool.query(`SELECT * FROM issues INNER JOIN users ON users.userid = author WHERE issues.projectid = ${keyid} AND issueid = ${userkeyid}`, (err, responseEdit) => {

        let resultEdit = responseEdit.rows[0]

        pool.query(`SELECT * FROM members INNER JOIN users ON users.userid = members.userid INNER JOIN projects ON projects.projectid = members.projectid WHERE members.projectid = ${keyid}`, (err, responseEdit2) => {

            let resultEdit2 = responseEdit2.rows
          console.log(resultEdit);
          
            
            
            
            res.render(`projects/issues/edit`, {
                title: 'Projects', nav1, keyid, user: req.session.user,resultEdit,moment, resultEdit2
            })
        })
    })
})

router.post('/issues/list/edit/:id/:issueid', (req, res, next) => {
  let keyid = req.params.id
  let userkeyid = req.params.issueid
  let flagedit = false

  let issueEdit = `UPDATE issues SET tracker='${req.body.trackerissueEdit}', subject='${req.body.subjectformEdit}', description='${req.body.descriptionformEdit}', status='${req.body.statusIssueEdit}', priority='${req.body.priorityissueEdit}', assignee=${req.body.assigneeformEdit}, startdate='${req.body.startdateformEdit}', duedate='${req.body.duedateformEdit}', estimatedtime=${req.body.estimatedformEdit}, done=${req.body.doneformEdit}, targetversion='${req.body.targetversionform}', parenttask=${req.body.parenttaskform}, updateddate='${moment().format('YYYY-MM-DD hh:mm:ss')}'`
  if (req.body.spenttimeform) {
      flagedit = true
      issueEdit += `, spenttime=${req.body.spenttimeform}`
  }
  if (req.body.statusIssueEdit == 'Closed') {
      flagedit = true
      issueEdit += `, closeddate='${moment().format('YYYY-MM-DD hh:mm:ss')}'`
  }
  issueEdit += ` WHERE projectid=${req.params.id} AND issueid=${req.params.issueid}`

  pool.query(issueEdit, (err, issueEditResult) => {

      console.log(issueEdit);
      
      pool.query(`INSERT INTO activity(title, description, author, time) VALUES (('${req.body.subjectformEdit}''#${req.params.id}''${req.body.statusIssueEdit}'), '${req.body.descriptionformEdit}', ${req.session.user.userid}, '${moment().format('YYYY-MM-DD hh:mm:ss')}')`, (err, issueEditResult2) => {
        
          res.redirect(`/projects/issues/list/${req.params.id}`)
      })
  })
  
})

router.get('/issues/list/delete/:id/:issueid',isLogged, (req, res) => {
  let issueiddel = req.params.issueid
  let projectiddel = req.params.id

  pool.query(`DELETE FROM issues WHERE issueid=${issueiddel} AND projectid =${projectiddel}`, (err) => {
      if (err) {
          console.log(err);
      } else {
          res.redirect(`/projects/issues/list/${projectiddel}`)
      }
  })
})

router.get('/activity/:id',isLogged, function (req, res, next) {
  let nav1 = 7
  let keyid = req.params.id

  let showAct = `SELECT * from activity INNER JOIN users ON users.userid = author ORDER BY activityid desc`
  pool.query(showAct, (err, resAct) => {
      let throwAct = resAct.rows

      console.log(moment().subtract(2, 'days').format('YYYY/MM/DD'));

      res.render('projects/activity', {
          title: 'Activity', nav1, user: req.session.user, keyid, moment, throwAct
      })
  })
})

  module.exports = router;