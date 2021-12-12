const server = require('../../bin/www');
const io = require('socket.io')(server);

const UserConnection = require('../../models/userconnection');

const { isSocketAuthenticated } = require('../../security/authenticate');

// Clear connections on startup
UserConnection.deleteMany({}).exec();
console.log("Connections cleared");

io.on('connect', async (socket) => {
    console.log(socket.id + ' connected');
    const user = await isSocketAuthenticated(socket);
    if (!user) {
        return;
    }

    // Create UserConnection for this user and socket
    let connection = await UserConnection.findOne({ user: user._id, socketid: socket.id }).exec();
    if (!connection) {
        connection = await (new UserConnection({ user: user._id, socketid: socket.id })).save();
    }

    socket.on('move', async ({ x, y }) => {
        connection = await UserConnection.findOneAndUpdate({ _id: connection._id }, { location: [+x, +y] });
    });

    socket.on('voice', async (data) => {
        let newData = data.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        connection = await UserConnection.findOne({ _id: connection._id });
        if (!connection || !connection.location) return;

        const connections = await UserConnection
            .find({ _id: { $ne: connection._id } });
        console.log(connections);
        emitToSockets(connections, 'send', { data: newData, username: user.username });
    });

    socket.on('disconnect', () => {
        UserConnection.deleteOne({ user: user._id, socketid: socket.id }).exec();
    });
});

const emitToSockets = (connections, event, payload) => {
    if (!connections || !connections.length) {
        return;
    }
    let ioto = io;
    for (let connection of connections) {
        ioto = ioto.to(connection.socketid);
    }
    ioto.emit(event, payload);
}

exports.emitToSockets = emitToSockets;