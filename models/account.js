var mongoose = require('mongoose')
, Schema = mongoose.Schema
, db = require('./db')
, register = require('./register');

var Account = new Schema({
    avatar        : { type: String, maxlength: 150, default: '/images/avatar.png' },
    avatar_mini   : { type: String, maxlength: 150, default: '/images/avatar_mini.png' },
    nickname      : { type: String, required: true, trim: true, minlength: 2, maxlength: 12 },
    bio           : { type: String, trim: true, maxlength: 140, default: '' },
    follows       : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    fans          : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    dreams        : [{ type: Schema.Types.ObjectId, ref: 'Dream', unique: true }],
    _following_d  : [{ type: Schema.Types.ObjectId, ref: 'Dream', unique: true }],
    nodes         : [{ type: Schema.Types.ObjectId, ref: 'Node', unique: true }],
    experiences   : [{ type: Schema.Types.ObjectId, ref: 'Experience', unique: true }],
    suggests      : [{ type: Schema.Types.ObjectId, ref: 'Suggest', unique: true }],
    messages      : [{ type: Schema.Types.ObjectId, ref: 'Message', unique: true }],
    tags          : [{ type: Schema.Types.ObjectId, ref: 'Tag', unique: true }],
    msgreviewdate : { type: Date },
    follow_guide  : { type: Boolean, default: false },
    dream_guide   : { type: Boolean, default: false },
    node_guide    : { type: Boolean, default: false },
    date          : { type: Date,  default: Date.now }
});

Account.index({'tags':1});
Account.index({'follows':1});
Account.index({'fans':1});
Account.index({'nodes':1});
Account.index({'experiences':1});
Account.index({'suggests':1});
Account.index({'dreams':1});
Account.index({'messages':1});
Account.index({'_following_d':1});
Account.plugin(register);
Account.plugin(db);

module.exports = mongoose.model('Account', Account);
