const path = require("path")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")
const Filter = require("bad-words")
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, getUser, getUsersInRoom, removeUser} = require('./utils/users')

const app = express()
//this command usually happens behind the scenes in 
const server = http.createServer(app)
const io = socketio(server) //this is why we had to refactor to create server and have the server listen

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath));



//server (emit) -> client (receive) - countUpdated
//client (emit) -> server (receive) - increment
io.on('connection', (socket) => {
    console.log('New WebSocket connection')

//options = {user, room}
    socket.on('join', (options, callback) => {
        const { error, user} = addUser({id: socket.id, ...options})
        if (error) {
            return callback(error)
        }
        socket.join(user.room)
        //this sends an event
        socket.emit('message',generateMessage('Admin', 'Welcome!')) //socket.emit:send to just one connection
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) //broadcast: send to all but connection
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
        //socket.emit, io.emit, socket.broadcast.emit
        //io.to.emit, socket.broadcast.to.emit
    })
    socket.on('sendMessage', (message, callback) => { //callback occurs on client
        const user = getUser(socket.id)
    
        const filter = new Filter()
        if  (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        console.log(message)
        io.to(user.room).emit('message', generateMessage(user.username, message)) //io.send: send to all
        callback()
    })



    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        message = `Location : ${coords.latitude},${coords.longitude}`
        //console.log(message)
        //io.emit('message', message)
        url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
        console.log(url)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!` ))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })
})


//http.Server is listening instead of Express app
server.listen(port, () => {
    console.log("listening on port " + port)
})