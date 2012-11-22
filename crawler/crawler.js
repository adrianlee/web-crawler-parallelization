var url = require('url'),
    request = require('request');


function linkScanner(body, callback) {
    var link_array = [];

    link_array.push("http://adrianlee.ca/");

    callback(link_array);
}

function crawl(link, callback) {
    var graph_json = {};

    // parse url
    var parsed_url = url.parse(link);

    var options = {
        url: link
    };

    request.get(options, function (error, response, body) {
        if (response.statusCode == 200) {
            // Scan links
            console.log("Scanning links from " + link);
            linkScanner(body, function (results) {
                console.log(results);
            });
        } else {
            // Log response
            console.log("Response " + response.statusCode + " from " + link)
        }
    });

    graph_json.node = {
        url: link
    };

    callback(graph_json);
}


crawl("http://adrianlee.ca/", function(graph_json) {
    console.log(graph_json);
});


