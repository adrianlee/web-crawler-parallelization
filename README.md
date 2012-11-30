Understanding the Parallelization Process via Web Crawling

Web Crawler Configurables
-
- # of Parallel Processes
- # of Links per Page to Visit
- Traversal Depth
- Visit External and/or Internal Links

Requirements
-
- [Node.js v0.8.14+](http://nodejs.org/)
- [Redis v2.6.6+](http://redis.io/download)

How to run
-
- Open `config.js` to set Web Crawler configurations
- `$ node crawler/cluster.js`
- `$ node gui/app.js`
- Access the GUI via web browser to the following address: [http://localhost:8080](http://localhost:8080)
- Enter a URL in the GUI input and hit *Start* in GUI!