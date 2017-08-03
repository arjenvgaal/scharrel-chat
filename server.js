var appConfig = require('./config.json');
var Express = require('express'),
    app = new Express();
var http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server);
var pug = require('pug');

var Token = require('./models/Token');
var Chat = require('./models/Chat');
var chatId, userId;

// Views options
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.set('view options', { layout: false });
app.use(Express.static(__dirname + '/public'));
server.listen(appConfig.port);
console.log('Server port:', appConfig.port);


function addMessageToDatabase(message) {
    Chat.insertMessage({ matchId: chatId, userId: userId, message: message}, function(error) {
        if (!error) {
            // console.log('msg added to db.');
        }
    });
}

// Spam filter options
var limitPerTime = 10;
var limitTime = 10.0;

io.sockets.on('connection', function (socket) { // First connection
    var timeMessageFirst, timeMessageLast;
    var messageCount = 0;

    socket.on('chat_token', function(token) {
        var chatData = {
            details: {},
            users: {},
            messages: {},
            messagesCount: 0
        };

        Token.getUserAndChatId(token, function(error, chatInfo) {
            // If there are no issues
            if (!error && chatInfo.length > 0) {
                chatId = chatInfo[0].id_match;
                userId = chatInfo[0].id_user;

                console.log('Connect user:', userId);

                chatData.details = {
                    chatId: chatId,
                    userId: userId
                };

                // TODO: Deactivate token (! if NodeJS restarts, token is undefined)
                // Token.deactivate(token);

                // Get messages related to chat
                Chat.getMessagesByChatId(chatId, function(error, chatMessages) {
                    if (!error) {
                        chatData.messages = chatMessages;

                        // Get users related to chat
                        Chat.getUsersByChatID(chatId, function(error, chatUsers) {
                            if (!error) {
                                chatData.users = chatUsers;

                                // Get total chat messages count
                                Chat.getMessagesTotalByChatId(chatId, function(error, response) {
                                    if (!error) {
                                            chatData.messagesCount = response[0].messagesTotal;
                                            // Transfer all relevant data to client
                                            socket.emit('chat_data', chatData);
                                    }
                                });
                            }
                        });
                    }
                });
            } else  {
                // TODO: What happens when error, or token is not active
                console.log('server: token is not active.');
            }
        });
    });

    socket.on('msg_receive', function(msg) {
        console.log('user ' + userId + ':', msg);

        // Anti-spam
        if (messageCount === 0) {
            socket.emit('msg_approve');
            addMessageToDatabase(msg);

            timeMessageFirst = new Date().getTime();
            messageCount++;

        } else if ( messageCount >= limitPerTime ) {
            timeMessageLast = new Date().getTime();

            // If first message and last message times are both recorded
            if (timeMessageLast && timeMessageFirst) {
                var timeBetweenMessages = (timeMessageLast - timeMessageFirst) / 1000;

                // If more messages sent than allowed per set time
                if (timeBetweenMessages < limitTime) {
                    socket.emit('msg_deny');
                    console.log('Spam! Not allowed time between messages:', timeBetweenMessages);
                    messageCount++;

                } else {
                    socket.emit('msg_approve');
                    addMessageToDatabase(msg);

                    // reset values
                    messageCount = 0;
                    timeMessageFirst = '';
                    timeMessageLast = '';
                }
            }
        // if message count between 0 and message limit per time
        } else {
            socket.emit('msg_approve');
            addMessageToDatabase(msg);

            messageCount++;
        }

        // console.log('Message number:', messageCount);
    });

    socket.on('msg_share', function (data) {
        var transmit = {
            date : new Date().toISOString(),
            message : data
        };

        // Broadcast to everyone except current user
        socket.broadcast.emit('msg_share', transmit);
    });

    socket.on('lazy_load_start', function(messageId) {
        // console.log('server: lazy loading');
        Chat.getMessagesBeforeMessageIdByChatId(chatId, messageId, function(error, chatMessages) {
            if (!error && chatMessages.length > 0) {
                socket.emit('lazy_load_data', chatMessages);
            } else {
                socket.emit('lazy_load_complete');
            }
        });
    });

    socket.on('disconnect', function() {
        console.log('Disconnect user:', userId);
    });
});

// Routes
app.get('/scharrel*', function(req, res) {
  res.render('scharrel/chat.pug');
});