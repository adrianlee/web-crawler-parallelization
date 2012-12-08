Understanding the Parallelization Process via Web Crawling

Web Crawler Configurables
-
- # of Parallel Workers
- # of Links to Visit per Page 
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


Screenshots
-
![](https://raw.github.com/adrianlee/web-crawler-parallelization/master/screenshot_console.png)


![](https://raw.github.com/adrianlee/web-crawler-parallelization/master/screenshot_gui_many_links.png)
