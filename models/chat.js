var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var Chat = new Schema({
    _blong_u: : { type: Schema.Types.ObjectId, ref: 'Account' },
    _from_u   : { type: Schema.Types.ObjectId, ref: 'Account' },
    _to_u     : { type: Schema.Types.ObjectId, ref: 'Account' },
    content   : { type: String, required: true, trim: true },
    date      : { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', Chat);
