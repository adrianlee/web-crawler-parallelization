var cluster = require('cluster'),
    numCPUs = 1 || require('os').cpus().length,
    config = require('../config'),
    crawler = require('./crawler'),
    worker = [];

if (cluster.isMaster) {
  var redis = require("redis"),
      redis_publisher = redis.createClient(),
      redis_subscriber = redis.createClient(),
      emitter = new (require('events').EventEmitter),
      current_depth = 0,
      async = require("async");

  ////////////////////////////////////////////////
  // Redis Configuration - Publisher
  ////////////////////////////////////////////////
  redis_publisher.on("connect", function () {
      console.log("Connected to Redis Server - Publisher");
  });

  redis_publisher.on("error", function (err) {
      console.log("Error " + err);
  });


  ////////////////////////////////////////////////
  // Redis Configuration - Subscriber
  ////////////////////////////////////////////////
  redis_subscriber.on("connect", function () {
      console.log("Connected to Redis Server - Subscriber");
  });

  redis_subscriber.on("error", function (err) {
      console.log("Error " + err);
  });

  redis_subscriber.on("message", function (channel, message) {
      var response_body;

      // console.log("channel " + channel + ": " + message);
      try {
          response_body = JSON.parse(message);

          // crawler.crawl(response_body, function(graph_json) {
          //     console.log(graph_json);
          // });

          scheduler(response_body);
      } catch(e) {
          console.log(e);
      }
  });

  redis_subscriber.on("ready", function () {
      redis_subscriber.subscribe("instruction");
  });


  ////////////////////////////////////////////////
  // Message Handler for Messages from Worker
  ////////////////////////////////////////////////
  function messageHandler(msg) {
    var parsed;
    // console.log("master: " + msg);
    try {
      parsed = JSON.parse(msg);
      emitter.emit(parsed.uuid, parsed);
    } catch(e) {
      console.log(e);
    }
  }


  ////////////////////////////////////////////////
  // Cluster Fork & Events
  ////////////////////////////////////////////////
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
    cluster.workers[i+1].on('message', messageHandler);
    cluster.workers[i+1].working = false;
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });


  ////////////////////////////////////////////////
  // Scheduler
  ////////////////////////////////////////////////
  function getWorker() {
    var i;
    for (i in cluster.workers) {
      if (!cluster.workers[i].working) {
        // console.log(i + " is not working");
        return cluster.workers[i];
      }
    }
    return false;
  }

  function scheduler(opts) {
    var i,
        worker,
        results,
        uuid;

    var q = async.queue(function (task, callback) {
      // console.log(task);
      // console.log('hello ' + task.url);
      worker = getWorker();
      var o = JSON.stringify(task);

      worker.send(o);

      emitter.once(task.uuid, function (msg) {
        callback(msg);
      });
    }, 2);


    console.log("Current Depth " + current_depth);

    if (current_depth === 0) {
      worker = getWorker();

      if (worker) {
        // worker.working = true;
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });

        worker.send(JSON.stringify({ uuid: uuid, msg: opts }));
      }

      // emitter.addListener('abc', function () {
      //   console.log('asd');
      // });

      emitter.once(uuid, function (msg) {
        console.log(msg);
        results = msg.msg;
        current_depth++;
        scheduler(results);
      });


    } else {
      var task_array = [],
          result_array = [],
          counter = 0;
      console.log(opts);
      for (i=0; opts.children && (i < opts.children.length); i++) {
        // worker = getWorker();
        // if (worker) {
        //   worker.working = true;
        //   worker.send("hello!");
        // }
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });

        task_array.push({ uuid: uuid, msg: { url: opts.children[i], depth: current_depth} });

        // console.log(opts.children[i]);
        // worker.working = true;
      }
      q.push(task_array, function (msg) {
        counter++;
        result_array.push(msg);
        if (counter >= task_array.length) {
          current_depth++;
          scheduler(result_array);
        }
      });
    }
  }

  setTimeout(function () {
    scheduler({ url: 'http://en.wikipedia.org/wiki/Nintendo' });
  }, 2000);

} else {
  ////////////////////////////////////////////////
  // Worker
  ////////////////////////////////////////////////
  process.on('message', function(msg) {
    // console.log(cluster.worker.id  + ": " + msg);
    try {
      var o = JSON.parse(msg);
      // console.log(o);
    } catch(e) {
      console.log(e);
    }
    crawler.crawl(o.msg, function(json) {
      process.send(JSON.stringify({ uuid: o.uuid, msg: json })); // not ideal but for prototype
    })
  });

  console.log("Worker started on CPU " + cluster.worker.id);
}