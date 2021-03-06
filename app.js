var polyfill = require('./polyfill.js');
var Physics = require('./lib/PhysicsJS-0.7.0/dist/physicsjs-full.js');

var util = require('util');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var app = express();
var http = require('http').Server(app);

var io = require('socket.io')(http);

var Client = require('node-rest-client').Client;

client = new Client();

client.registerMethod("jsonMethod", "https://eakjb-shout-ninja2.firebaseio.com/settings/chats/usernameImageMap.json", "GET");

var usernameImageMap = {};
var randomNames = ['Jeff', 'Bob'];

var viewWidth = 3000;
var viewHeight = 1500;
var foodCount = 20;
var minimumMergeDifference = 0.25;

var idCounter = 0;



String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) {
        return a.toUpperCase();
    });
};

var idCounter = 0;

client.methods.jsonMethod(function(data, response) {
    usernameImageMap = JSON.parse(data);
    randomNames = Object.keys(usernameImageMap);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var world = Physics();

// bounds of the window
var viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);

// constrain objects to these bounds
world.add(Physics.behavior('edge-collision-detection', {
    aabb: viewportBounds,
    restitution: 0.3,
    cof: 0.75
}));

// ensure objects bounce when edge collision is detected
world.add(Physics.behavior('body-impulse-response'));

// add some gravity
// world.add(Physics.behavior('constant-acceleration'));

world.add(Physics.behavior('body-collision-detection'));
world.add(Physics.behavior('sweep-prune'));

world.add(Physics.integrator('verlet', {
    drag: 0.005
}));

// If you want to subscribe to collision pairs
// emit an event for each collision pair
world.on('collisions:detected', function(data) {
    var c;
    for (var i = 0, l = data.collisions.length; i < l; i++) {
        c = data.collisions[i];

        //Combine the areas of the two colliding elements using a geometric mean
        var area1 = Math.pow(c.bodyA.radius, 2);
        var area2 = Math.pow(c.bodyB.radius, 2);
        var combinedArea = area1 + area2;
        var newRadius = Math.sqrt(combinedArea);

        //Ensure the sizes are different by a threshold
        if (Math.abs(area1 / combinedArea - area2 / combinedArea) > minimumMergeDifference) {
            var message;
            if (area1 > area2) {
                world.remove(c.bodyB);
                c.bodyA.radius = newRadius;
                message = c.bodyA.username.capitalize() + " ate " + c.bodyB.username;
            }
            else {
                world.remove(c.bodyA);
                c.radius = newRadius;
                message = c.bodyB.username.capitalize() + " ate " + c.bodyA.username;
            }
            message+=".";
            io.emit("chat message",{
                text:message
            });
        }
    }
});

world.on('step', function() {
    var myFoodCount = 0;
    world.getBodies().forEach(function(body) {
        if (body.foodValue) {
            myFoodCount++;
        }
    });
    
    var username = randomNames[Math.floor(Math.random() * randomNames.length)];
    for (var i = 0; i < foodCount - myFoodCount; i++) {
        var foodValue = Math.random() * 20;
        world.add(Physics.body('circle', {
            x: Math.random() * viewWidth, // x-coordinate
            y: Math.random() * viewWidth, // y-coordinate
            vx: (Math.random() - 0.5) * 7, // velocity in x-direction
            vy: (Math.random() - 0.5) * 7, // velocity in y-direction
            radius: foodValue,
            foodValue: foodValue,
            username: username,
            image: usernameImageMap[username]
        }));
    }
});

http.listen(process.env.PORT || 4000, process.env.IP, function() {
    console.log('listening on *:' + (process.env.PORT || 4000));
});

io.on('connection', function(socket) {
    console.log('Connection.');

    var username = randomNames[Math.floor(Math.random() * randomNames.length)];
    var entity = Physics.body('circle', {
        x: 100, // x-coordinate
        y: 100, // y-coordinate
        vx: 0, // velocity in x-direction
        vy: 0, // velocity in y-direction
        radius: 10,
        $id: ++idCounter,
        username: username,
        image: usernameImageMap[username]
    });

    var attractor = Physics.behavior('attractor', {
        strength: 0.0001,
        min: 70,
        order: 0,
        pos: {
            x: 100, //todo init correctly
            y: 100
        }
    });
    attractor.applyTo([entity]);
    world.add(attractor);

    world.add(entity);

    socket.on('chat message', function(msg) {
        console.log('message: ' + msg);
        io.emit('chat message', {
            text: msg,
            timestamp: 0,
            user: {
                username: entity.username,
                image: entity.image
            }
        });
    });

    socket.emit('physics initResponse', {
        $id: idCounter,
        width: viewWidth,
        height: viewHeight
    });
    
    socket.on('physics input', function(data) {
        attractor.position(data);
    });

    socket.on('disconnect', function() {
        console.log('disconnect');
        world.remove(entity);
    });
});

var updateLoop = function() {
    setTimeout(updateLoop,1000/18);
    var entities = [];
    world.getBodies().forEach(function(body) {
        entities.push(util._extend({
            radius: body.radius,
            $id: body.$id,
            username: body.username,
            image: body.image
        }, body.state));
    });
    io.emit('physics state', entities);
};
updateLoop();

// subscribe to the ticker
Physics.util.ticker.on(function(time) {
    world.step(time);
});
// start the ticker
Physics.util.ticker.start();

module.exports = app;
