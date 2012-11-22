var url = require('url');


function crawl(link, callback) {
    var graph_json = {};

    // parse url
    var parsed_url = url.parse(link);

    graph_json.node = {
        url: link
    };

    callback(graph_json);
}


crawl("http://adrianlee.ca", function(graph_json) {
    console.log(graph_json);
});


