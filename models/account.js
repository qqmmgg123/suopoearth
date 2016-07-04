var mongoose = require('mongoose')
, Schema = mongoose.Schema
, register = require('./register');

var Account = new Schema({
    avatar      : { type: String, maxlength: 150 },
    nickname    : { type: String, required: true, trim: true, minlength: 2, maxlength: 12 },
    bio         : { type: String, trim: true, maxlength: 140 },
    follows     : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    fans        : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    dreams      : [{ type: Schema.Types.ObjectId, ref: 'Dream', unique: true }],
    _following_d: [{ type: Schema.Types.ObjectId, ref: 'Dream', unique: true }],
    nodes       : [{ type: Schema.Types.ObjectId, ref: 'Node', unique: true }],
    messages    : [{ type: Schema.Types.ObjectId, ref: 'Message', unique: true }],
    date        : { type: Date, default: Date.now }
});

Account.index({'follows':1});
Account.index({'fans':1});
Account.index({'nodes':1});
Account.index({'dreams':1});
Account.index({'messages':1});
Account.index({'_following_d':1});
Account.plugin(register);
module.exports = mongoose.model('Account', Account);
