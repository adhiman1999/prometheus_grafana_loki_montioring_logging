const express = require('express');
const Prometheus = require('prom-client');
const promMid = require('express-prometheus-middleware');
const winston = require('./config/winston');
const morgan = require('morgan');
const app = express();
const PORT = 8080;
app.use(promMid({
 metricsPath: '/metrics',
 collectDefaultMetrics: true,
 requestDurationBuckets: [0.1, 0.5, 1, 1.5],
}));
app.use(morgan('combined', { stream: winston.stream }));
const error_1_counter = new Prometheus.Counter({
    name: 'error_1_counter',
    help: 'The total number of times error 1 occurred',
});
const error_2_counter = new Prometheus.Counter({
    name: 'error_2_counter',
    help: 'The total number of times error 2 occurred',
});

app.get('/', (req, res) => {
 console.log('GET /');
});
app.get('/hello', (req, res) => {
 const { name = 'you' } = req.query;
 res.json({ message: `Hello, ${name}!` });
 console.log('GET /hello');
});
app.get('/hi', (req, res) => {
 const { name = 'you' } = req.query;
 res.json({ message: `Hi, ${name}!` });
 console.log('GET /hi');
});
app.get('/error1', (req, res) => {
    //simulate error
    try{
        //some task
        throw new Error('Error 1 just occurred');

    }catch(err){
        error_1_counter.inc();
        res.status(500).json({message: err.message});

    }
    //res.status(500).json({ message: 'Something went wrong!' });
    console.log('GET /error1');
});
app.get('/error2', (req, res) => {
    //simulate error
    try{
        //some task
        throw new Error('Error 2 just occurred');

    }
    catch(err){
        error_2_counter.inc();
        res.status(500).json({message: err.message});

    }
    //res.status(500).json({ message: 'Something went wrong!' });
    console.log('GET /error2');
});
app.listen(PORT, () => {
 console.log(`App listening at <http://localhost>:${PORT}`);
});