module.exports = {
    // Crawler & Socket Port
    guiPort: 8080,
    crawlerMasterPort: 3000,

    // Crawler Configuration
    allow_external_links: false,
    allow_internal_links: true,

    // Max # of links to parse per page
    max_children: 2,

    // Max tree height
    max_depth: 10,

    // # of Workers to spawn
    num_processes: 4,

    // For wikipedia sites
    wiki_bodyContent_only: true

};