// ***********************************************packages-import**************************************************
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const redis = require('redis');
const useragent = require('express-useragent');
const elasticsearch = require('elasticsearch');
const requestIp = require('request-ip');

const esClient = new elasticsearch.Client({
  hosts: ['http://3.139.243.255:9200'],
});                                             //Elasticsearch 

const app = express();
app.use(requestIp.mw());
app.use(useragent.express());

const client = redis.createClient(6379, '3.131.254.70');
client.on('connect', () => {
  console.log('Redis server connected');
});                                             //Redis  
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ****************************************************Redis Endpoints*********************************************
app.get('/', (req, res) => {
//  res.send('Welcome!');

  client.exists('bookss', (err, reply) => {
    if (reply === 1) {
      client.hgetall('bookss', (err, books) => {
        // console.log("done");
        res.render('index', { books, reply });
      });
    } else {
      console.log('empty');
      res.render('index', { reply });
    }
  });
});

app.post('/book/add', (req, res) => {
  const newBook = {};
  newBook.id = req.body.id;
  newBook.name = req.body.name;
  newBook.author = req.body.author;
  newBook.cost = req.body.cost;
  client.hmset('bookss', ['name', newBook.name, 'author', newBook.author, 'id', newBook.id, 'cost', newBook.cost], (err, reply) => {
    if (err) {
      console.log(err);
    }
    console.log(reply);
    client.hmset(`book:${newBook.id}`, [
      'name', newBook.name, 'author', newBook.author, 'id', newBook.id, 'cost', newBook.cost,
    ], (error, replyy) => {
      if (err) {
        console.log(error);
      }
      console.log(replyy);
      res.redirect('/');
    });
  });
});

app.post('/book/search', (req, res, next) => {
  console.log(req.body);
  const { id } = req.body;

  client.hgetall(`book:${id}`, (err, obj) => {
    if (!obj) {
      res.render('search', {
        error: 'Book not found!!', books: '',
      });
    } else {
      obj.id = id;
    	console.log(obj);

      res.render('search', {
        book: obj, books: 'exists', error: '',
      });
    }
  });
});

app.get('/search', (req, res) => {
  res.render('search', {
    error: '',
    books: '',
  });
});

app.post('/book/delete/:id', (req, res) => {
  const { id } = req.params;
  client.del(`book:${req.params.id}`);

  console.log(typeof client.hget('bookss', 'id'));
  client.hget('bookss', 'id', (err, reply) => {
    if (id == reply) {
      // console.log(reply)
      // console.log('there');
      client.del('bookss');
    }
  });

  res.redirect('/search');
});
// *************************************************Elasticsearch endpoints*****************************************************
app.get('/elastic', (req, res) => {
  const IP = req.clientIp;
  const userAgent = req.useragent.source;
  esClient.index({
    index: 'userconf',
    body: {
      ip: IP,
      useragent: userAgent,
    },
  }).then((resp) => {
    console.log('User config', resp);
    res.send('succesful');
  }).catch((err) => console.log('Error', err));
});

app.get('/search-ua/:ua', (req, res) => {
  esClient.search({
    index: 'userconf',
    body: {
      query: {
        match_phrase: {
          useragent: { query: req.params.ua, slop: 100 },
        },
      },
    },

  }).then((resp) => {
    console.log('Successful query! Here is the response:', resp);
    res.send(resp);
  }, (err) => {
    console.trace(err.message);
    res.send(err.message);
  });
});
app.get('/search-ip/:ip', (req, res) => {
  esClient.search({
    index: 'userconf',
    body: {
      query: {
        match_phrase: {
          ip: { query: req.params.ip, slop: 100 },
        },
      },
    },

  }).then((resp) => {
    console.log('Successful query! Here is the response:', resp);
    res.send(resp);
  }, (err) => {
    console.trace(err.message);
    res.send(err.message);
  });
});
// *************************************************************App*********************************************

app.listen(5000);
console.log('Server Started on Port 5000');
module.exports = app;