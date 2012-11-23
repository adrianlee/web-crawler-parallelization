var url = require('url'),
    request = require('request'),
    cheerio = require('cheerio');


function linkScanner(body, callback) {
    var link_array = [],
        $ = cheerio.load(body),
        i,
        tag_a;

    tag_a = $("a");

    console.log(tag_a.length + " links parsed");

    for (i = 0; i < tag_a.length; i++) {
        // console.log(tag_a[i].attribs.href);

        // parse url
        // var parsed_url = url.parse(link);

        link_array.push(tag_a[i].attribs.href);
    }

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
            graph_json.node = {
                url: link
            };

            callback(results);
        });
    });

}


crawl("http://adrianlee.ca/", function(graph_json) {
    console.log(graph_json);
});


