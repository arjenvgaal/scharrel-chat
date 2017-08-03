var socket = io.connect();
var messageContainer, submitButton, chatWindow, downButton;
var userName, userData, buddyData;
var idOldestLoadedMessage, totalMessages, lazyLoading;

// configuration
var chatSizePerTime = 30;

function createElement(elementType, text, elementId) {
    var newText = document.createTextNode(text);
    var newTextContainer = document.createElement(elementType);
    newTextContainer.append(newText);

    document.getElementById(elementId).append(newTextContainer);
}

function scrollToBottom() {
    window.scrollTo(0, chatWindow.scrollHeight);
}

function addSingleMessageToScreen(msg, currentUserName, beforeExisting) {
    var newEntry = document.createElement('div');
    var newImage = document.createElement('div');

    var newText = document.createTextNode(/* date + ' - ' +  userName + ' ' +  */ msg);
    var newTextContainer = document.createElement('p');
    newTextContainer.appendChild(newText);

    newEntry.setAttribute('class', 'chat-entry');
    newImage.setAttribute('class', 'pic-message');

    if (userData.firstName === currentUserName) {
        newImage.style.backgroundImage = 'url("' + userData.picture + '")';
        newEntry.style.textAlign = 'right';

        newEntry.appendChild(newTextContainer);
        newEntry.appendChild(newImage);
    } else {
        newImage.style.backgroundImage = 'url("' + buddyData.picture + '")';

        // Reverse order of appending
        newEntry.appendChild(newImage);
        newEntry.appendChild(newTextContainer);
    }

    // Add to screen
    var chatEntries = document.getElementById('chat-entries');

    if (beforeExisting) {
        chatEntries.insertBefore(newEntry, chatEntries.childNodes[0]);

    } else {
        chatEntries.appendChild(newEntry);
        scrollToBottom();
    }
}

function addMultipleMessagesToScreen(msgs, beforeExisting) {
    // Add chat history
    var amountOfMessages = msgs.length - 1;
    var msgN, message;

    var addMessages = function() {
        message = msgs[msgN];

        // Save oldest loaded timestamp
        if (msgN === amountOfMessages) {
            idOldestLoadedMessage = message.id;
            // console.log('ID last loaded msg:', idOldestLoadedMessage);
        }

        // Check userId's
        if (message.user === userData.id) {
            addSingleMessageToScreen(decodeURI(message.message), userData.firstName, beforeExisting);
        } else if (message.user === buddyData.id ) {
            addSingleMessageToScreen(decodeURI(message.message), buddyData.firstName, beforeExisting);
        }
    };

    // Control order of adding messages
    if (beforeExisting) {
        // Get current div height (old)
        var chatWindowHeightOld = chatWindow.scrollHeight;

        // Add messages
        for ( msgN = 0; msgN <= amountOfMessages; msgN++ ) { addMessages(); }

        // Get divheight again (new)
        var chatWindowHeightNew = chatWindow.scrollHeight;

        // Calculate height to set, and set
        var heightToSet = chatWindowHeightNew - chatWindowHeightOld;
        window.scrollTo(0, heightToSet);

        // Calculate how many messages left to load
        totalMessages = totalMessages - chatSizePerTime;

        // Enable lazy loading again
        lazyLoading = true;
    } else {
        for ( msgN = amountOfMessages; msgN >= 0; msgN-- ) { addMessages(); }
    }
}

function submitMessage() {
    var inputText = messageContainer.value;

    if (inputText !== '' && userName !== '') {
        addSingleMessageToScreen(inputText, userName);

        socket.emit('msg_share', {
            text: inputText,
            user: userName
        });

        messageContainer.value = '';
    }
}

function allowMessages() {
    messageContainer.addEventListener('keypress', function(e) {
        // When enter is pressed
        if (e.which === 13) {
            socket.emit('msg_receive', messageContainer.value);
        }
    });
}

function detectScrolling() {
    window.onscroll = function() {
        // If more than certain amount of pixels above bottom of the page
        if ((window.innerHeight + window.scrollY) <= (document.body.offsetHeight - 200)) {
            // you're at the bottom of the page
            downButton.style.display = 'inline';
        } else {
            downButton.style.display = 'none';
        }

        // If at the top of the page
        if (document.body.scrollTop < 10 || document.documentElement.scrollTop > 10) {
            if (lazyLoading) {
                lazyLoading = false;

                // Load new chat
                socket.emit('lazy_load_start', idOldestLoadedMessage);
            }
        }
    };
}

// On page load
window.onload = function() {
    messageContainer = document.getElementById('messageInput');
    submitButton = document.getElementById('submit');
    downButton = document.getElementById('chat-down');
    chatWindow = document.getElementById('chat-entries');

    // Get user and match IDs from URL and show relevant messages with same chat id
    var chatToken = window.location.pathname.replace('/scharrel-', '');
    // Send token to server side
    socket.emit('chat_token', chatToken);

    downButton.onclick = scrollToBottom;
};

// * RECEIVED ONLY BY CURRENT USER *
socket.on('chat_data', function(chatData) {
    totalMessages = chatData.messagesCount;
    // console.log('Total messages:', totalMessages);

    // If total message count is higher than messages per load
    if (totalMessages > chatSizePerTime) {
        lazyLoading = true;
    }

    if (chatData.users[0].id === chatData.details.userId) {
        userData = chatData.users[0];
        buddyData = chatData.users[1];
    } else if (chatData.users[1].id === chatData.details.userId) {
        buddyData = chatData.users[0];
        userData = chatData.users[1];
    }

    // Set match picture + name at top of chat
    document.getElementById('pic-chat').style.backgroundImage = 'url("' + buddyData.picture + '")';
    createElement('p', buddyData.firstName, 'chat-name');

    addMultipleMessagesToScreen(chatData.messages);
    allowMessages();
    detectScrolling();
    userName = userData.firstName;
    scrollToBottom();
});

socket.on ('msg_approve', function() {
    submitMessage(); // Add to screen and database
});

socket.on ('msg_deny', function() {
    messageContainer.value = '';
});

socket.on('lazy_load_data', function(chatMessages) {
    addMultipleMessagesToScreen(chatMessages, true);
});

socket.on('lazy_load_complete', function() {
    window.onscroll = null;
    console.log('Lazy load completed.');
});


// * RECEIVED BY ALL USERS EXCEPT CURRENT USER *
socket.on ('msg_share', function(data) {
    addSingleMessageToScreen(data.message.text, data.message.user);
});


// * RECEIVED BY ALL USERS *
socket.on('connect', function() {
    // console.log('Connected.');
});