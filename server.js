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
    // send the std_out back
    socket.on('run', function (req, res) {
        // write a temp file for .py code
        var uid = Date.now(); 
        var source = "./tmp/input/" + uid + ".py"; 
        var dist = "./tmp/output/" + uid; 
        fs.writeFile(source, req.code, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The input file was saved!");
        });
        fs.writeFile(dist, "", function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The output file was saved!");
        });
        
        // run .py code and hear from stdout
        var pyshell = new PythonShell(source); 
        pyshell.on('message', function (stdout) {
            var temp = stdout;
            console.log(temp);
            fs.appendFile(dist, temp, function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The output file was appended!");
            });
        });
        
        pyshell.end(function () {
            fs.readFile(dist,"utf-8", function (err, data) {
                if (err) {
                    return console.log(err);
                }
                console.log("hello read file");
                console.log(data);
                res({
                    timestamp: Date.now(), 
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