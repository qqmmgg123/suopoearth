var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var Activity = new Schema({
    alias      : { type: String, minlength: 2, maxlength: 12, trim: true },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account', require: true },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    _create_s  : { type: Schema.Types.ObjectId, ref: 'Suggest' },
    _create_e  : { type: Schema.Types.ObjectId, ref: 'Experience' },
    _create_n  : { type: Schema.Types.ObjectId, ref: 'Node' },
    _create_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    tags       : [{ type: Schema.Types.ObjectId, ref: 'Tag', unique: true }],
    type       : { type: Number, required: true, default: 0 },
    date       : { type: Date, default: Date.now }
});

Activity.index({'tags':1});
module.exports = mongoose.model('Activity', Activity);
