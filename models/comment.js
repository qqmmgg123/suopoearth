var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var Comment = new Schema({
    isreply   : { type: Boolean, default: false},
    author    : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    other     : { type: String, minlength: 2, maxlength: 12, trim: true },
    content   : { type: String, required: true, minlength: 1, maxlength: 140, trim: true },
    _belong_u : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d : { type: Schema.Types.ObjectId, ref: 'Dream' },
    _belong_n : { type: Schema.Types.ObjectId, ref: 'Node' },
    _reply_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _reply_c  : { type: Schema.Types.ObjectId, ref: 'Comment' },
    supporters: [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    opponents : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    date      : { type: Date, default: Date.now }
});

Comment.index({'supporters':1});
Comment.index({'opponents':1});
module.exports = mongoose.model('Comment', Comment);
