var express = require('express');
var url = require('url');
var http = require('http');
var httpProxy = require('http-proxy');
var util = require('util');

var app = express();

/*
 * Simple preview server for AJAX apps. Includes a basic AJAX proxy.
 * This server will naively serve any files from the app's home directory (and its children).
 * 
 * DO NOT USE FOR PRODUCTION
*/


var APP_PORT = process.env.PORT || 3000;

console.log('\n========================================\n')
console.log('Development Preview Server\nDO NOT USE IN PRODUCTION!!!\n');
console.log('Listening on port ' + APP_PORT);
console.log('AJAX proxy bound to "/_proxy"');
console.log('     eg. http://localhost:3000/_proxy/http://example.com/a/b/c');
console.log('\n========================================\n');

//app.use(express.logger());
app.use(express.bodyParser());

function ajaxProxy(req, res, next){
    if (req.method === "OPTIONS") {
        next();
        return;
    }
    var target = req.url.substring("/_proxy/".length, req.url.length);

    console.log("PROXY request received. Target: " + target);

    // parse the url
    var url_parts = url.parse(target);

    // Simple validation of well-formed URL
    if(url_parts.host == undefined) {
        var err = "PROXY Error: Malformed target URL " + target;
        console.log('PROXY_PORT Error: '+err);
        res.statusCode=501;
        res.write(err);
        res.end();
    } else {
        console.log("PROXY Request: " + url_parts.hostname + ", port: " + (url_parts.port ? url_parts.port : 80) + ", path: " + (url_parts.path ? url_parts.path : url_parts.pathname));

        // Create and configure the proxy.

        var proxy = new httpProxy.HttpProxy({
            target:{
                host: url_parts.hostname,
                port: url_parts.port ? url_parts.port : 80,
                https: (url_parts.protocol === 'https:')
            }
        });

        // Rewrite the URL on the request to remove the /proxy/ prefix.
        // Then pass along to the proxy.

        // Heroku's version of http-proxy requires the use of 'pathname' instead of 'path'
        req.url = (url_parts.path ? url_parts.path : url_parts.pathname);
        req.headers['host']=url_parts.host;  // Reset the host header to the destination host.

        if (req.query.alf_method === 'PUT')
            req.method = 'PUT';

        proxy.proxyRequest(req, res);

    } // end if-else

}

function cors(req, res, next) {
    if (req.get('Origin')) {
        console.log('>>>> Returning CORS headers');
        res.set({
            'Access-Control-Allow-Origin': req.get('Origin'),
            'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': req.get('Access-Control-Request-Headers'),
            'Access-Control-Allow-Credentials': true
        });
    }
    next();
}

app.options('/*', cors, function(req, res, next){
    console.log(">>>> Preflight Request Received");
    res.send(200,'OK');
});

app.all('/_proxy/*', cors, ajaxProxy);
/*
app.get('/_proxy/*', cors, ajaxProxy);
app.put('/_proxy/*', cors, ajaxProxy);
app.post('/_proxy/*', cors, ajaxProxy);
app.delete('/_proxy/*', cors, ajaxProxy);
*/

app.post('/up2', cors, function(req, res){
    res.status(200);
    console.log(">>>> Upload Received");
    console.log(req.files.doc);
    res.send('OK');
});

app.post('/up', function(req, res, next){

    console.log(req.files.doc);

    if (req.query.redirect) {
        console.log(">>>> REDIRECTING to "+req.query.redirect);
        res.status(302);
        req.set('Location', req.query.redirect+'Success!!');
    } else {
        res.status(200);
        res.send('OK');
    }
});

app.post('/upload', cors, function(req, res){
    res.status(200);
    res.send('OK');
});


// Serve static files from local directory
app.use(express.static(__dirname));

app.listen(APP_PORT);

process.on('uncaughtException', function(err) {
    console.log(err);
});