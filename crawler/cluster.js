var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;


var worker = [];

if (cluster.isMaster) {
  function messageHandler(msg) {
    console.log("master: " + msg);
  }

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
    cluster.workers[i+1].on('message', messageHandler)
  }

  console.log(cluster.workers[4].send("hello"));


  // console.log(cluster.workers);

  cluster.on('message', function(message) {
    console.log(message);
  });

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {

  process.on('message', function(msg) {
    process.send(msg);
    console.log(cluster.worker.id  + ": " + msg);
  });

  console.log("Worker started on CPU " + cluster.worker.id);
}