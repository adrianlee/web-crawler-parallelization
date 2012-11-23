var express = require('express'),
    path = require('path'),
    util = require('util'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    hbs = require('hbs'),
    redis = require("redis"),
    redis_client = redis.createClient(),
    config = require('../config');


////////////////////////////////////////////////
// Redis Configuration
////////////////////////////////////////////////
redis_client.on("connect", function () {
    console.log("Connected to Redis Server");
});

redis_client.on("error", function (err) {
    console.log("Error " + err);
});

redis_client.on("message", function (channel, message) {
    console.log("channel " + channel + ": " + message);
    io.sockets.emit('data', message);
});

redis_client.on("ready", function () {
    redis_client.subscribe("hello");
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

////////////////////////////////////////////////
// HTTP Server
////////////////////////////////////////////////
server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
