var db = require('../dbconnection');

var Token = {
    getUserAndChatId:function(token, callback) {
        return db.query('SELECT *  FROM scharrel_chat_token WHERE token = ? AND active = 1', [token], callback);
    },
    deactivate:function(token, callback) {
        return db.query('UPDATE scharrel_chat_token SET active = NULL WHERE token = ?', [token], callback);
    }
};

module.exports = Token;