var cluster = require('cluster');
var http = require('http');
var numCPUs = 1 || require('os').cpus().length;


var worker = [];

if (cluster.isMaster) {
  // Message Handler for Messages from Worker
  function messageHandler(msg) {
    console.log("master: " + msg);
  }

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
    cluster.workers[i+1].on('message', messageHandler)
  }

  cluster.on('message', function(msg) {
    console.log(msg);
  });

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });

  cluster.workers[1].send("hello");
} else {

  process.on('message', function(msg) {
    process.send(msg);
    console.log(cluster.worker.id  + ": " + msg);
  });

  console.log("Worker started on CPU " + cluster.worker.id);
}