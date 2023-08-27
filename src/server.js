const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const {Server} = require('socket.io');

const port = process.env.PORT || 8080;
const loggingEnabled = process?.env?.LOGGING_ENABLED === "TRUE";
const app = express();
console.log("current directory: ", __dirname);
app.use(express.static(path.join(__dirname, "build")));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origins: "*:*",
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"],
        pingTimeout: 7000,
        pingInterval: 3000
    }
});

app.use(cors({origin: "*"}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

function log(text) {
    if (loggingEnabled) {
        console.log(text);
    }
}

io.on('connection', socket => {
    log("client connected to socket server " + socket.id);
    socket.on('start', (lat, lng) => {
        log(`Received start message ${lat} ${lng}`);
        io.emit('start', lat, lng);
    });
    socket.on('stop', () => {
        log("Received stop message");
        io.emit('stop');
    });
    socket.on('device-1', (receivedData1) => {
        let receivedData = receivedData1;
        if (typeof receivedData === 'string' || receivedData instanceof String) {
            try {
                receivedData = JSON.parse(receivedData);
            } catch (e) {
                log("Unable to convert device data to JSON object: " + receivedData1);
                return;
            }
        }
        log("received data from device: " + JSON.stringify(receivedData));
        if (!receivedData) {
            log("Undefined data");
            return;
        }
        if (!receivedData["Position"]) {
            log("Data missing position");
            return;
        }
        if (receivedData["Position"]["x"] === undefined || receivedData["Position"]["y"] === undefined || receivedData["Position"]["z"] === undefined) {
            log("Position data missing either x, y, or z");
            return;
        }
        if (!receivedData["Orientation"]) {
            log("Data missing orientation");
            return;
        }
        if (receivedData["Orientation"]["x"] === undefined || receivedData["Orientation"]["y"] === undefined || receivedData["Orientation"]["z"] === undefined || receivedData["Orientation"]["w"] === undefined) {
            log("Orientation data missing either x, y, z, or w");
            return;
        }
        if (!receivedData["Confidence"]) {
            log("Data missing confidence");
            return;
        }
        io.emit('device-data', receivedData);
    });
});

server.listen(port, () => {
    log(`Listening on the port ${port}`);
}).on('error', e => {
    console.error(e);
});
