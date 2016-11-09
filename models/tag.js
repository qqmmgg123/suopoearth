var mongoose = require('mongoose')
, db         = require('./db')
, Schema     = mongoose.Schema;

var Tag = new Schema({
    key    : { type: String, unique: true, index: true, required: true, minlength: 1, maxlength: 12, trim: true, dropDups: true },
    dreams : [{ type: Schema.Types.ObjectId, ref: 'Dream', unique: true }],
    suggests : [{ type: Schema.Types.ObjectId, ref: 'Suggest', unique: true }],
    experiences: [{ type: Schema.Types.ObjectId, ref: 'Experoences', unique: true }],
    date   : { type: Date, default: Date.now }
});

Tag.plugin(db);
module.exports = mongoose.model('Tag', Tag);
