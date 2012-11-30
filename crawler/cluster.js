var cluster = require('cluster'),
    config = require('../config'),
    numCPUs = config.num_processes || require('os').cpus().length,
    crawler = require('./crawler'),
    worker = [];

if (cluster.isMaster) {
  ////////////////////////////////////////////////
  // Master
  ////////////////////////////////////////////////
  var redis = require("redis"),
      redis_publisher = redis.createClient(),
      redis_subscriber = redis.createClient(),
      emitter = new (require('events').EventEmitter),
      async = require("async"),
      start_time,
      end_time,
      current_depth = 0,
      node_traversed = 0;

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

      try {
          response_body = JSON.parse(message);
          current_depth = 0;
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

    try {
      parsed = JSON.parse(msg);
      node_traversed++;
      cluster.workers[parsed.worker].working = false;
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
        cluster.workers[i].working = true;
        return cluster.workers[i];
      }
    }
    return false;
  }
  var root;

  function scheduler(opts) {
    var i,
        q,
        worker,
        results,
        uuid;

    q = async.queue(function (task, callback) {
      while (true) {
        worker = getWorker();

        if (worker) {
          var o = JSON.stringify(task);
          worker.send(o);
          emitter.once(task.uuid, function (msg) {
            callback(msg);
          });
          break;
        }
      }
    }, numCPUs);

    q.drain = function() {
      console.log('all items have been processed');
    };

    console.log("Current Depth " + current_depth);

    if (current_depth === 0) {
      // Root Node
      start_time = new Date();
      worker = getWorker();

      if (worker) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });

        worker.send(JSON.stringify({ uuid: uuid, msg: opts }));
      }

      emitter.once(uuid, function (msg) {
        results = msg.msg;
        current_depth++;
        scheduler(results);
      });


    } else {
      // All other nodes
      var task_array = [],
          result_array = [],
          counter = 0;

      // Make sure input is an Array
      if( Object.prototype.toString.call( opts ) === '[object Array]' ) {
        // console.log( 'Array!' );
      } else {
        opts = [{uuid: 0, msg: opts}];
      }

      for (var node in opts) {
        // Push each children to task queue
        for (i=0; opts[node].msg.children && (i < opts[node].msg.children.length); i++) {
          uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
              return v.toString(16);
          });

          opts[node].msg.uuid = uuid;

          task_array.push({ uuid: uuid, msg: { parent_uuid: opts[node].uuid, url: opts[node].msg.children[i], depth: current_depth} });

        }
      }

      // Push task queue to worker queue for processing
      q.push(task_array, function (msg) {
        counter++;
        result_array.push(msg);
        if (counter >= task_array.length) {
          current_depth++;

          redis_publisher.publish("data", JSON.stringify(result_array));

          if (current_depth <= config.max_depth) {
            scheduler(result_array);
          } else {
            end_time = new Date();
            console.log("///////////////////////////////////////////////////");
            console.log("// Crawler Config & Statistic");
            console.log("///////////////////////////////////////////////////");
            console.log("Max Children Size: \t\t" + config.max_children);
            console.log("Max Traversal Depth: \t\t" + config.max_depth);
            console.log("# of Workers Spawned: \t\t" + config.num_processes);
            console.log("# of nodes traversed: \t\t" + node_traversed);
            console.log("");
            console.log("///////////////////////////////////////////////////");
            console.log("// Crawler Results");
            console.log("///////////////////////////////////////////////////");
            console.log("Start Time(ms): \t\t" + start_time.getTime());
            console.log("Start Time(ms): \t\t" + end_time.getTime());
            console.log("Total Time(ms): \t\t" + (end_time.getTime() - start_time.getTime()).toString());
            node_traversed = 0;
          }
        }
      });
    }
  }

} else {
  ////////////////////////////////////////////////
  // Worker
  ////////////////////////////////////////////////
  process.on('message', function(msg) {
    try {
      var o = JSON.parse(msg);
    } catch(e) {
      console.log(e);
    }

    // Crawl!
    crawler.crawl(o.msg, function(json) {
      // Message pass results to Master
      process.send(JSON.stringify({ worker: cluster.worker.id, uuid: o.uuid, msg: json })); // not ideal but for prototype
    }, cluster.worker.id)
  });

  console.log("Worker #" + cluster.worker.id + " started");
}