var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var Message = new Schema({
    _belong_u : { type: Schema.Types.ObjectId, ref: 'Account' },
    url       : { type: String, required: true, trim: true },
    title     : { type: String, required: true, trim: true },
    content   : { type: String, trim: true },
    date      : { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', Message);
