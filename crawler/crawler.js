var url = require('url'),
    request = require('request'),
    cheerio = require('cheerio'),
    config = require('../config');

var start_link = "http://adrianlee.ca";
var start_link = "http://hksn.ca";
var start_link = "http://en.wikipedia.org/wiki/Nintendo";


function linkScanner(body, callback) {
    var link_array = [],
        $ = cheerio.load(body),
        i,
        tag_a;

    tag_a = $("a");

    console.log(tag_a.length + " links parsed");

    for (i = 0; i < tag_a.length; i++) {
        if (tag_a[i].attribs.href && validateLink(tag_a[i].attribs.href)) {
            link_array.push(tag_a[i].attribs.href);
        }
    }

    callback(link_array);
}

function validateLink(link) {
    var valid = false,
        parsed_url = url.parse(link);

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

        if (parsed_url.hash == parsed_url.href) {
            valid == false;
        }
    }

    return valid;
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
    var graph_json = {},
        time_start = new Date().getTime(),
        time_end;

    getBody(link, function (error, body) {
        if (error) {
            console.log("Something went wrong: " + error);
        }

        linkScanner(body, function (results) {
            graph_json = {
                url: link,
                time_start: time_start,
                time_end: new Date().getTime(),
                children: results
            };

            callback(graph_json);
        });
    });

}


crawl(start_link, function(graph_json) {
    console.log(graph_json);
});

