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
  connectionString: process.env.DATABASE_URL || 'postgres://qhxindpxmbvwzk:a2d9f5349e93980317295d2fa58061533210fb21de3cf7f516180dc1f3427dee@ec2-54-204-2-26.compute-1.amazonaws.com:5432/d75omanv9qj10q',
  ssl: true
})

const sg = require('sendgrid')(process.env.SENDGRID_API_KEY || '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')

var db

mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://cmartinez:cdelsur1@localhost:27017/heroku-local", function (err, client) {
  console.log(process.env.MONGODB_URI)
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
  app.post('/api/mail', (req, res) => {
    const env = process.env.NODE_ENV || 'local'
    var helper = require('sendgrid').mail
    var from_email = new helper.Email(req.body.from)
    var to_email = new helper.Email(req.body.to)
    var subject = req.body.subject
    var content = new helper.Content('text/plain', `${req.body.content} from env: ${env}`)
    var mail = new helper.Mail(from_email, subject, to_email, content)
    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    })
    sg.API(request, function(error, response) {
      if (error) {
        handleError(response, error.message, "Failed to create send mail.")
      } else {
        console.log('Status code => ' + response.statusCode);
        console.log('Body => ' + response.body);
        console.log('Headers => ' + response.headers);
        res.status(response.statusCode).json(response.body)
      }
    })
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
})

function handleError(res, message, prettyMessage) {
  console.log(`Res => ${res} - ${message} - ${prettyMessage}`)
  response.status(res.statusCode).json(response.body);
}