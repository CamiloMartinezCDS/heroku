const { Pool } = require('pg')
const cool = require('cool-ascii-faces')
const bodyParser = require("body-parser")
const mongodb = require("mongodb")
const ObjectID = mongodb.ObjectID
const express = require('express')
const path = require('path')

var CONTACTS_COLLECTION = "contacts"
const PORT = process.env.PORT || 5000

const pool = new Pool({
  connectionString: 'postgres://qhxindpxmbvwzk:a2d9f5349e93980317295d2fa58061533210fb21de3cf7f516180dc1f3427dee@ec2-54-204-2-26.compute-1.amazonaws.com:5432/d75omanv9qj10q',
  ssl: true
})

var db

mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://cdelsur_admin:cdelsur1@ds151180.mlab.com:51180/heroku_j1mh12hh", function (err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = client.db();
  console.log("Database connection ready");
  var app = express()

  app.use(express.static(path.join(__dirname, 'public')))
  app.use(bodyParser.json())
  app.set('views', path.join(__dirname, 'views'))
  app.set('view engine', 'ejs')
  app.get('/', (req, res) => res.render('pages/index'))
  app.get('/cool', (req, res) => res.send(cool()))
  app.get('/times', (req, res) => {
      let result = ''
      const times = process.env.TIMES || 5
      for (i = 0; i < times; i++) {
        result += i + ' '
      }
      res.send(result)
    })
  .get('/db', async (req, res) => {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM test_table');
      res.render('pages/db', result);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  app.get("/api/contacts", function(req, res) {
    db.collection(CONTACTS_COLLECTION).find({}).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get contacts.")
      } else {
        res.status(200).json(docs)
      }
    })
  })
  app.post("/api/contacts", function(req, res) {
    var newContact = req.body
    if (!req.body.name) {
      handleError(res, "Invalid user input", "Must provide a name.", 400)
    }
    console.log(`newContact => ${JSON.stringify(newContact)}`)
    db.collection(CONTACTS_COLLECTION).insertOne(newContact, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to create new contact.")
      } else {
        console.log(`newContact => ${JSON.stringify(newContact)}`)
        res.status(201).json(doc.ops[0]);
      }
    })
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
})

function handleError(res, message, prettyMessage) {
  console.log(`Res => ${res} - ${message} - ${prettyMessage}`)
}