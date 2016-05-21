'use strict'

var http = require('http');
var port = process.env.port || 1337;
var fs = require('fs'); 
var io = require('socket.io');
var PythonShell = require('python-shell'); 
// web content
var client = fs.readFileSync('client.html'); 

// ref: http://stackoverflow.com/questions/18052762/remove-directory-which-is-not-empty
var deleteFolderRecursive = function (path) {
    if (!(path == './tmp/del' || path == './tmp/input' || path == './tmp/output')) {
        return console.log('Bad Try with rm -r'); 
    }

    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


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

// create the cron job to clean folder
var CronJob = require('cron').CronJob;
//new CronJob('00 30 12 * * *', function () {
//    console.log('You will see this message every day on 12:30 AM as LAX time.');
//}, null, true, 'America/Los_Angeles');
new CronJob('00 30 12 * * *', function () {
    
    var clean = function (path) {
        if (!(path == './tmp/del' || path == './tmp/input' || path == './tmp/output')) {
            return console.log('Bad Try with clean function()');
        }
        fs.stat(path, function (err, stats) {
            if (err) {
                return console.log(err);
            }
            if (stats.isDirectory()) {
                deleteFolderRecursive(path);
                console.log("rm -r " + path);
                fs.mkdir(path, function () {
                    console.log("Re-mkdir" + path);
                });
            }
        });
    };
    server.close()
    //fixme: close socket.io server
    console.log('Server restart');
    var my_clean_list = function () {
        var folder_1 = './tmp/input';
        clean(folder_1);
        var folder_2 = './tmp/output';
        clean(folder_2);
    };

    my_clean_list(); 
    
    return server.listen(port); 
    //fixme: re-open socket.io server
}, null, true, 'America/Los_Angeles');

// run the server 
server.listen(port); 