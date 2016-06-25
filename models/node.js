var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var Node = new Schema({
    author     : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    content    : { type: String, required: true, minlength: 1, maxlength: 140, trim: true },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    comments   : [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    supporters : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    opponents  : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    date       : { type: Date, default: Date.now }
});

Node.index({'supporters': 1});
Node.index({'opponents': 1});
module.exports = mongoose.model('Node', Node);
