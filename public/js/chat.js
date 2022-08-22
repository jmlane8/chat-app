const socket = io()

// server (emit) -> client (receive)  -- acknowledgement--> server
// client (emit) -> server (receive)  -- acknowledgement--> client


//Elements
const $messageForm =  document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

const autoscroll = () => {
    //New message element
    const $newMessage = $messages.lastElementChild

    //Height of new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    //Visible height
    const visibleHeight = $messages.offsetHeight

    //Height of messages container
    const containerHeight = $messages.scrollHeight

    //How far have I scrolled?
    const scrollOffset = $messages.scrollTop  + visibleHeight

    //are we at the bottom (before last message was added)
    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}
socket.on('message', (message) => {
    console.log( message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("h:mm a")
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (message)=>{
    console.log(message)
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        locationUrl: message.url,
        createdAt: moment(message.createdAt).format("h:mm a")
    })
    $messages.insertAdjacentHTML('beforeend',html)
    autoscroll()
})

socket.on('roomData', ({room, users}) => {
    const html  = Mustache.render(sidebarTemplate, {
        room,
        users
    })
   document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) =>{
    e.preventDefault()
    //console.log('submit')
     
    $messageFormButton.setAttribute('disabled', 'disabled')
    var chatInput = e.target.elements.message
    var chatMessage = chatInput.value
    chatInput.value = ""
    
    socket.emit('sendMessage', chatMessage, (error) =>{
        
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value =''
        $messageFormInput.focus()
        if (error){
            return console.log("Error: ", error)
        } else {
        console.log('The message was delivered!')
        }
    })
})

$locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.')
    }
    
    $locationButton.setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition( (position) => {
        const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }
        socket.emit("sendLocation", coords,  () => {
            $locationButton.removeAttribute('disabled')
            console.log("Location shared!")
        })

    })
    $locationButton.removeAttribute('disabled')
})

socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})
