var db = require('../dbconnection');

var Chat = {
    getMessagesTotalByChatId:function(id, callback) {
        return db.query('SELECT COUNT(*) AS messagesTotal FROM scharrel_message WHERE id_match = ?', [id], callback);
    },
    getMessagesByChatId:function(id, callback) {
        return db.query('SELECT * FROM scharrel_message WHERE id_match = ? ORDER BY timestamp DESC LIMIT 30',
            [id], callback);
    },
    getMessagesBeforeMessageIdByChatId:function(id, idMessageLast, callback) {
        return db.query('SELECT * FROM scharrel_message WHERE ID_match = ? AND id < ? ' +
            'ORDER BY timestamp DESC LIMIT 30', [id, idMessageLast], callback);
    },
    getUsersByChatID:function(id, callback) {
        return db.query('SELECT facebook_user.* FROM facebook_user INNER JOIN scharrel_match ' +
            'ON facebook_user.id = scharrel_match.user_1 OR facebook_user.id = scharrel_match.user_2 ' +
            'WHERE scharrel_match.id = ?', [id], callback);
    },
    insertMessage:function(message, callback) {
        return db.query('INSERT INTO scharrel_message(id_match, user, message) VALUES(?,?,?)',
            [message.matchId, message.userId, encodeURI(message.message)], callback);
    }
};

module.exports = Chat;
