// ***********************************************packages-import**********************************
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const redis = require('redis');
const useragent = require('express-useragent');
const elasticsearch = require('elasticsearch');
const url = require('url');
const prClient = require('prom-client');
const requestIp = require('request-ip');

const esClient = new elasticsearch.Client({
  hosts: ['http://3.139.243.255:9200'],
}); // Elasticsearch

const app = express();
app.use(requestIp.mw());
app.use(useragent.express());

const register = new prClient.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'NodeApp',
});
// Enable the collection of default metrics
prClient.collectDefaultMetrics({ register });
// create a Histogram metric
const httpRequestDurationMicroseconds = new prClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in microseconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});
register.registerMetric(httpRequestDurationMicroseconds);
// register metric
const client = redis.createClient(6379, '3.131.254.70');
client.on('connect', () => {
  console.log('Redis server connected');
}); // Redis
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ****************************************************Redis Endpoints************
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

app.get('/metrics', (req, res) => {
  const route = url.parse(req.url).pathname;
  const end = httpRequestDurationMicroseconds.startTimer();
  if (route === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(register.metrics());
  }
  end({ route, code: res.statusCode, method: req.method });
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
// *************************************************Elasticsearch endpoints*********************
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
// *************************************************************App*************

app.listen(5000);
console.log('Server Started on Port 5000');
module.exports = app;
