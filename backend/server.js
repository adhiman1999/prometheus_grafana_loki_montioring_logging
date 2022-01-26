const express = require('express');
const Prometheus = require('prom-client');
const promMid = require('express-prometheus-middleware');
const logger = require('./logger');
const app = express();
const PORT = 8080;
app.use(promMid({
 metricsPath: '/metrics',
 collectDefaultMetrics: true,
 requestDurationBuckets: [0.1, 0.5, 1, 1.5],
}));
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
 logger('GET /');
});
app.get('/hello', (req, res) => {
 const { name = 'you' } = req.query;
 console.log('GET /hello');
 logger.info('GET /hello')
 res.json({ message: `Hello, ${name}!` });
});
app.get('/hi', (req, res) => {
 const { name = 'you' } = req.query;
 console.log('GET /hi');
 logger.info('GET /hi')
 res.json({ message: `Hi, ${name}!` });
});
/*
    console.log
    console.error
    console.info
    console.warn
    console.debug
    
*/
app.get('/error1', (req, res) => {
    //simulate error
    try{
        //some task
        throw new Error('Error 1 just occurred');

    }catch(err){
        error_1_counter.inc();
        console.error(err);
        logger.error(err);
        res.status(500).json({message: err.message});

    }
    //res.status(500).json({ message: 'Something went wrong!' });
    console.log('GET /error1');
    logger.info('GET /error1')
});
app.get('/error2', (req, res) => {
    //simulate error
    try{
        //some task
        throw new Error('Error 2 just occurred');

    }
    catch(err){
        console.error(err);
        logger.error(err)
        error_2_counter.inc();
        res.status(500).json({message: err.message});

    }
    //res.status(500).json({ message: 'Something went wrong!' });
    console.log('GET /error2');
    logger.info('GET /error2')
});
app.listen(PORT, () => {
 console.log(`App listening at <http://localhost>:${PORT}`);
});