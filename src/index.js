const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
    generateMessage,
    generateLocationMessage,
} = require("./utils/messages");
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,
} = require("./utils/users");


const app = express();
const server = http.createServer(app); 
const io = socketio(server) // express() auto creates a http server but socket.io doesn't

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");
app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
    console.log("socket.io server connection");

    socket.on("join", ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit("message", generateMessage('chat-admin', `welcome ${user.username}!`));

        socket.broadcast
            .to(user.room)
            .emit("message", generateMessage('chat-admin', `${user.username} joined`));

        callback();
    });

    socket.on("sendMessage", (message, callback) => {
        const user = getUser(socket.id);

        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback("profanity is not allowed");
        }

        io.to(user.room).emit(
            "message",
            generateMessage(user.username, message)
        );

        callback();
    });

    socket.on("sendLocation", (coords, callback) => {
        const user = getUser(socket.id);;

        io.to(user.room).emit(
            "locationMessage",
            generateLocationMessage(
                user.username,
                `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
            )
        );

        callback();
    });

    socket.on("disconnect", () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit(
                "message",
                generateMessage('chat-admin', `${user.username} left`)
            );
        }

    });
});

server.listen(port, () => {
    console.log("nodejs server connected on port " + port);
});
