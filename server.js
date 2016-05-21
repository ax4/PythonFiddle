'use strict'

var http = require('http');
var port = process.env.port || 1337;
var fs = require('fs'); 
var io = require('socket.io');
var PythonShell = require('python-shell'); 
// web content
var client = fs.readFileSync('client.html'); 

// http server: send the web content
var server = http.createServer(function (req, res) {
    res.writeHead(200, {});
    res.end(client); 
});

// socket.io server: exchange data dynamically  
var ioserver = io(server);

ioserver.on('connection', function (socket) {
    console.log("A user connected!" + socket.id); 
    // send the std_out back
    socket.on('run', function (req, res) {
        var uid = socket.id.slice(1, 22); 
        // write a temp file for .py code
        var time = Date.now();
        var rand = req.rand; 
        var source = "./tmp/input/" + time + rand + uid + ".py"; 
        var dist = "./tmp/output/" + time + rand + uid;  
        fs.writeFile(source, req.code, function (err) {
            if (err) {
                return console.log(err);
            }
            //console.log("The input file was saved!");
        });
        fs.writeFile(dist, "", function (err) {
            if (err) {
                return console.log(err);
            }
            //console.log("The output file was saved!");
        });
        
        // run .py code and hear from stdout
        var pyshell = new PythonShell(source);
        
        pyshell.on('message', function (stdout) {
            var temp = stdout;
            //console.log(temp);
            //var time = Date.now();
            //console.log(time);
            fs.appendFileSync(dist, temp); 
        });
        
        pyshell.end(function () {
            fs.readFile(dist,"utf-8", function (err, data) {
                if (err) {
                    return console.log(err);
                }
                //console.log("hello read file");
                //console.log(data);
                res({
                    timestamp: time, 
                    file: pyshell.script, 
                    code: req.code, 
                    result: data,  
                }); 
            });
            
        });
    });
});

// run the server 

server.listen(port); 