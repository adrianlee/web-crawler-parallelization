var url = require('url'),
    request = require('request');


function linkScanner(body, callback) {
    var link_array = [];

    // parse url
    // var parsed_url = url.parse(link);

    link_array.push("http://adrianlee.ca/");

    callback(link_array);
}

function getBody(link, callback) {
    // Send GET request to link.
    var options = {
        url: link
    };

    request.get(options, function (error, response, body) {
        if (error) {
            callback(error);
        }

        if (response && response.statusCode == 200) {
            // Scan links
            console.log("Scanning links from " + link);
            callback(null, body);
        } else {
            // Log response
            console.log("Response " + response.statusCode + " from " + link)
        }
    });
}

function crawl(link, callback) {
    var graph_json = {};

    getBody(link, function (error, body) {
        if (error) {
            console.log("Something went wrong: " + error);
        }

        linkScanner(body, function (results) {
            console.log(results);

            graph_json.node = {
                url: link
            };

            callback(graph_json);
        });
    });

}


crawl("http://adrianlee.ca/", function(graph_json) {
    console.log(graph_json);
});


