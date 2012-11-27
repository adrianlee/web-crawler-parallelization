var url = require('url'),
    path = require('path'),
    request = require('request'),
    cheerio = require('cheerio'),
    redis = require("redis"),
    redis_publisher = redis.createClient(),
    redis_subscriber = redis.createClient(),
    config = require('../config');

var start_link = "http://adrianlee.ca";
var start_link = "http://hksn.ca";
var start_link = "http://en.wikipedia.org/wiki/Nintendo";


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

    console.log("channel " + channel + ": " + message);
    try {
        response_body = JSON.parse(message);
        console.log(response_body.url);
        crawl(response_body, function(graph_json) {
            console.log(graph_json);
        });
    } catch(e) {
        console.log(e);
    }
});

redis_subscriber.on("ready", function () {
    redis_subscriber.subscribe("instruction");
});


////////////////////////////////////////////////
// Crawler Methods
////////////////////////////////////////////////
function linkScanner(body, callback) {
    var results = [],
        $ = cheerio.load(body),
        i,
        tag_a,
        counter;

    // If we are parsing Wikipedia. Just scan within #bodyContent
    if (config.wiki_bodyContent_only) {
        $ = cheerio.load($("#bodyContent").html());
    }

    tag_a = $("a");

    console.log(tag_a.length + " links parsed");

    for (i = 0; i < tag_a.length; i++) {
        if (results.length < config.max_children) {
            if (tag_a[i].attribs.href && validateLink(tag_a[i].attribs.href)) {
                // console.log("publish " + tag_a[i].attribs.href);
                redis_publisher.publish("data", tag_a[i].attribs.href);
                results.push(tag_a[i].attribs.href);
            }
        }
    }

    callback(results);
}

function validateLink(link) {
    var valid,
        parsed_url = url.parse(link);

    valid = false;

    /* Example Outputs */

    /*
    { protocol: 'http:',
    slashes: true,
    host: 'www.nintendo.com',
    hostname: 'www.nintendo.com',
    href: 'http://www.nintendo.com/consumer/downloads/SPR_EN_NA.pdf',
    pathname: '/consumer/downloads/SPR_EN_NA.pdf',
    path: '/consumer/downloads/SPR_EN_NA.pdf' }

    { protocol: 'http:',
    slashes: true,
    host: 'www.nintendo.com',
    hostname: 'www.nintendo.com',
    href: 'http://www.nintendo.com/consumer/buyers_guide.jsp',
    pathname: '/consumer/buyers_guide.jsp',
    path: '/consumer/buyers_guide.jsp' }

    { pathname: '/wiki/Sin_and_Punishment',
    path: '/wiki/Sin_and_Punishment',
    href: '/wiki/Sin_and_Punishment' }

    { pathname: '//hu.wikipedia.org/wiki/Nintendo',
    path: '//hu.wikipedia.org/wiki/Nintendo',
    href: '//hu.wikipedia.org/wiki/Nintendo' }

    { search: '?title=Special:Book&amp;bookcmd=book_creator&amp;referer=Nintendo',
    query: 'title=Special:Book&amp;bookcmd=book_creator&amp;referer=Nintendo',
    pathname: '/w/index.php',
    path: '/w/index.php?title=Special:Book&amp;bookcmd=book_creator&amp;referer=Nintendo',
    href: '/w/index.php?title=Special:Book&amp;bookcmd=book_creator&amp;referer=Nintendo' }

    { hash: '#cite_note-27', href: '#cite_note-27' }
    */

    // console.log("Validating " + link);
    if (parsed_url) {
        if (config.allow_internal_links) {
            // Local links have href == path
            if (parsed_url.href == parsed_url.path) {
                valid = true;
            }

            // Ignore links that begin with //
            if (parsed_url.href.charAt(0) + parsed_url.href.charAt(1) == "//") {
                valid = false;
            }

            // Ignore root links
            if (parsed_url.href == "/") {
                valid = false;
            }
        }

        if (config.allow_external_links) {
            if (parsed_url.protocol == "http:" || parsed_url.protocol == "https:") {
                valid = true;
            }

            if (parsed_url.href.charAt(0) + parsed_url.href.charAt(1) == "//") {
                valid = true;
            }
        }

        // Check for anchor
        if (parsed_url.hash == parsed_url.href) {
            valid = false;
        }

        // Check for filenames
        if (parsed_url.path && path.extname(parsed_url.path)) {
            // console.log("found " + path.extname(parsed_url.path));
            valid = false;
        }
    }

    return valid;
}


function getBody(opts, callback) {
    // Send GET request to link.
    var options = {
        url: opts.url
    };

    console.log(opts);

    request.get(options, function (error, response, body) {
        var status = 0;

        if (error) {
            callback(error);
        }

        if (response && response.statusCode) {
            status = 200;
        }

        if (status == 200) {
            callback(null, body);
        } else {
            // Log response
            callback("Response " + status + " from " + link);
        }
    });
}

function crawl(opts, callback, temp) {
    var graph_json = {},
        time_start = new Date().getTime(),
        time_end;

    // Get body html
    getBody(opts, function (error, body) {
        if (error) {
            console.log(error);
        }

        // Scan links
        console.log("Scanning links from " + opts.url);
        linkScanner(body, function (results) {
            graph_json = {
                url: opts.url,
                depth: opts.depth,
                time_start: time_start,
                time_end: new Date().getTime(),
                children: results
            };

            callback(graph_json, temp);
        });
    });
}


////////////////////////////////////////////////
// Init
////////////////////////////////////////////////


// crawl(start_link, function(graph_json) {
//     var i,
//         counter = 0;

//     // console.log(graph_json);

//     for (i = 0; i < graph_json.children.length; i++) {
//         crawl("http://en.wikipedia.com" + graph_json.children[i], function (json, temp) {
//             graph_json.children[temp] = json;
//             counter++;
//             if (counter >= graph_json.children.length) {
//                 console.log(graph_json);
//                 // redis_client.publish("data", "inside", redis.print);
//             }
//         }, i);
//     }
// }, null);

