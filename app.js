var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(process.env.PORT || 5000);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function (socket) {
  console.log('Client connected');
  console.log('Sending a link');
  socket.emit('play', { link: 'http://download.wavetlan.com/SVV/Media/HTTP/MP4/ConvertedFiles/MediaCoder/MediaCoder_test4_1m10s_MPEG4SP_VBR_258kbps_176x144_30fps_MPEG1Layer3_CBR_32kbps_Stereo_48000Hz.mp4' });
  socket.on('disconnect', function () {
    console.log('Client disconnect');
  });
});