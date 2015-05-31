/**
 * Created by jakebillings on 5/30/15.
 */
var socket = io();

var refreshTime = 5;

var c = document.getElementById("viewport");
var ctx = c.getContext("2d");

var $id = -1;

var xOffset = 0;
var yOffset = 0;

var viewWidth=0;
var viewHeight=0;

var input = {};

socket.on('physics state', function(data) {
    if ($id >= 0) {
        data.forEach(function(entity) {
            if (entity.$id&&entity.$id==$id) {
                xOffset = entity.pos._[0] - c.width/2;
                yOffset = entity.pos._[1] - c.height/2;
            }
        });

        ctx.clearRect(0,0, c.width, c.height);
        ctx.fillStyle="#111111";
        ctx.fillRect(0,0, c.width, c.height);

        ctx.fillStyle="#CCCCCC";
        ctx.fillRect(0-xOffset,0-yOffset,viewWidth,viewHeight);

        data.forEach(function(entity) {
            ctx.beginPath();
            ctx.arc(entity.pos._[0]-xOffset, entity.pos._[1]-yOffset, Math.ceil(entity.radius), 0, 2 * Math.PI);
            ctx.stroke();
        });
    }
});

socket.on('physics initResponse', function(data) {
    $id=data.$id;
    viewWidth=data.width;
    viewHeight=data.height;
    console.log(data);
});

c.addEventListener('mousemove',function(e) {
    var rect = c.getBoundingClientRect();
    input.x = (e.clientX - rect.left)+xOffset;//-rect.width/2;
    input.y = (e.clientY - rect.top)+yOffset;//-rect.height/2;
    physicsInput();
});

var physicsInput = function() {
    console.log(input);
    socket.emit('physics input',input);
};