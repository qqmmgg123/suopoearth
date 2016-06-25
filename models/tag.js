var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var Tag = new Schema({
    key  : { type: String, required: true, minlength: 1, maxlength: 12, trim: true },
    date : { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tag', Tag);
