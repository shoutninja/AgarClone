/**
 * Created by jakebillings on 5/30/15.
 */
var socket = io();

var refreshTime = 5;

var c = document.getElementById("viewport");
var ctx = c.getContext("2d");

socket.on('physics state', function(data) {
    ctx.clearRect(0,0, c.width, c.height);
    data.forEach(function(entity) {
        ctx.beginPath();
        ctx.arc(entity.pos._[0], entity.pos._[1], Math.ceil(entity.radius), 0, 2 * Math.PI);
        ctx.stroke();
    });
});

var input = {};

c.addEventListener('mousemove',function(e) {
    var rect = c.getBoundingClientRect();
    input.x = (e.clientX - rect.left);//-rect.width/2;
    input.y = (e.clientY - rect.top);//-rect.height/2;
    physicsInput();
});

var physicsInput = function() {
    socket.emit('physics input',input);
};