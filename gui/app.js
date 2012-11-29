var express = require('express'),
    path = require('path'),
    util = require('util'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    hbs = require('hbs'),
    redis = require("redis"),
    redis_subscriber = redis.createClient(),
    redis_publisher = redis.createClient(),
    config = require('../config'),
    crypto = require('crypto');


io.set('log level', 1)

////////////////////////////////////////////////
// Redis Configuration
////////////////////////////////////////////////
redis_subscriber.on("connect", function () {
    console.log("Connected to Redis Server - Subscriber");
});

redis_subscriber.on("error", function (err) {
    console.log("Error " + err);
});

redis_subscriber.on("message", function (channel, message) {
    // console.log("channel " + channel + ": " + message);
    io.sockets.emit('data', message);
});

redis_subscriber.on("ready", function () {
    redis_subscriber.subscribe("data");
});


////////////////////////////////////////////////
// Express Configuration
////////////////////////////////////////////////
app.configure(function(){
    app.set('port', config.guiPort || 8080);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.engine('html', hbs.__express);
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

////////////////////////////////////////////////
// Handlebars
////////////////////////////////////////////////
var blocks = {};

hbs.registerHelper('extend', function(name, context) {
    var block = blocks[name];
    if (!block) {
        block = blocks[name] = [];
    }

    block.push(context(this));
});

hbs.registerHelper('block', function(name) {
    var val = (blocks[name] || []).join('\n');

    // clear the block
    blocks[name] = [];
    return val;
});

////////////////////////////////////////////////
// Router
////////////////////////////////////////////////
app.get('/', function(req, res) {
    res.render('index', { title: 'ECSE420 Web Crawler Visualization' });
});

app.post('/start', function(req, res) {
    console.log(req.body);
    try {
        redis_publisher.publish("instruction", JSON.stringify(req.body));
    } catch(e) {
        console.log(e);
    }
    res.send(200);
});

app.get('/generator/:links/:hash', function(req, res) {
    var i,
        uuid,
        body = "";

    body += "<div id='bodyContent'>";

    for (i=0; i < parseInt(req.params.links); i++) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        body += "<a href=\"/generator/" + req.params.links + "/" + uuid + "\">link</a></br>";
    }

    body += "</div>";

    res.send(200, body);
});

////////////////////////////////////////////////
// HTTP Server
////////////////////////////////////////////////
server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
