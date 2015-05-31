/**
 * Created by jakebillings on 5/30/15.
 */
String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) {
        return a.toUpperCase();
    });
};

var socket = io();

var refreshTime = 5;

var c = document.getElementById("viewport");
var ctx = c.getContext("2d");
c.width = (window.innerWidth / 5) * 4;
c.height = window.innerHeight;




var $id = -1;

var xOffset = 0;
var yOffset = 0;

var viewWidth = 0;
var viewHeight = 0;

var input = {};

$('form').submit(function() {
    if ($('#m').val()) {
        var newVal = ': ' + $('#m').val();
        socket.emit('chat message', newVal);
        $('#m').val('');
        return false;
    }
    else {
        return false;
    }
});

socket.on('chat message', function(msg) {
    $('#messages').append($('<li>').text(msg.text));
});

socket.on('physics state', function(data) {
    if ($id >= 0) {
        data.forEach(function(entity) {
            if (entity.$id && entity.$id == $id) {
                xOffset = entity.pos._[0] - c.width / 2;
                yOffset = entity.pos._[1] - c.height / 2;
            }
        });

        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#aaa";
        ctx.fillRect(0, 0, c.width, c.height);

        ctx.fillStyle = "#ecf0f1";
        ctx.fillRect(0 - xOffset, 0 - yOffset, viewWidth, viewHeight);

        //Some experimental grid testing.
        for (var x = 1; x < 3000; x += 50) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 3000);
        }

        for (var y = 1; y < 1500; y += 50) {
            ctx.moveTo(0, y);
            ctx.lineTo(1500, y);
        }

        ctx.strokeStyle = "#aaa";
        ctx.stroke();

        data.forEach(function(entity) {
            ctx.beginPath();
            ctx.arc(entity.pos._[0] - xOffset, entity.pos._[1] - yOffset, Math.ceil(entity.radius), 0, 2 * Math.PI);
            ctx.stroke();

            if (entity.image) {
                var img = new Image();
                img.width = entity.radius;
                img.height = entity.radius;
                img.src = entity.image;
                ctx.drawImage(img, entity.pos._[0] - xOffset - entity.radius,
                    entity.pos._[1] - yOffset - entity.radius,
                    entity.radius*2,entity.radius*2);
            }

            ctx.fillStyle = "#333";
            ctx.font = "16px";
            ctx.fillText(entity.username.capitalize(), entity.pos._[0] - xOffset - entity.radius, entity.pos._[1] - yOffset + entity.radius + 15);
            console.log(entity);
        });
    }
});

socket.on('physics initResponse', function(data) {
    $id = data.$id;
    viewWidth = data.width;
    viewHeight = data.height;
    console.log(data);
});

c.addEventListener('mousemove', function(e) {
    var rect = c.getBoundingClientRect();
    input.x = (e.clientX - rect.left) + xOffset; //-rect.width/2;
    input.y = (e.clientY - rect.top) + yOffset; //-rect.height/2;
    physicsInput();
});

var physicsInput = function() {
    console.log(input);
    socket.emit('physics input', input);
};