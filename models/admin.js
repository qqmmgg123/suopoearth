var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var Admin = new Schema({
    date          : { type: Date,  default: Date.now }
});

Account.plugin(cadmin);

module.exports = mongoose.model('Admin', Admin);

