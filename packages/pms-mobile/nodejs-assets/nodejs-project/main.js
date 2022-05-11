// Rename this sample file to main.js to use on your project.
// The main.js file will be overwritten in updates/reinstalls.

const rn_bridge = require('rn-bridge');

// Echo every message received from react-native.
rn_bridge.channel.on('message', (msg) => {
  rn_bridge.channel.send(msg);
} );

// Inform react-native node is initialized.
rn_bridge.channel.send("Node was initialized.");

rn_bridge.channel.send("Creating...");

const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require("path");

http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  try {
    fs.readdirSync(u.query['p']).forEach(file => {
      res.write(file);
      res.write("\r\n")
    });
  } catch (e) {
    res.write('Error ' + e.name + ' p=' + u.query['p']);
  }
  res.end();
}).listen(1234, () => {
  rn_bridge.channel.send("Listening");
});


rn_bridge.channel.send(process.cwd());
rn_bridge.channel.send(__dirname);

fs.writeFileSync(path.join(__dirname, 'abc.com'), 'oke');