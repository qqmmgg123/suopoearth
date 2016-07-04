var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var Activity = new Schema({
    alias      : { type: String, minlength: 2, maxlength: 12, trim: true },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account', require: true },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    _create_n  : { type: Schema.Types.ObjectId, ref: 'Node' },
    _create_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    type       : { type: Number, required: true },
    date       : { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', Activity);
