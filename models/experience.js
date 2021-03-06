var mongoose = require('mongoose')
    , striptags = require('../striptags')
    , async = require("async")
    , Schema = mongoose.Schema;

var Experience = new Schema({
    content    : { type: String, required: true, minlength: 1, trim: true },
    summary    : { type: String, required: true, minlength: 1, maxlength: 150, trim: true },
    images     : { type: String },
    category   : { type: Number, reqiured: true, default: 3 },
    author     : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    comments   : [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    supporters : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    opponents  : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    tags       : [{ type: Schema.Types.ObjectId, ref: 'Tag', unique: true }],
    date       : { type: Date, default: Date.now }
});

Experience.index({'tags': 1});
Experience.index({'supporters': 1});
Experience.index({'opponents': 1});

Experience.methods.extract = function() {
    var self = this;
    var str  = striptags(this.content)
    this.summary = str.length > 147? str.slice(0, 147) + '...':str;
    this.images  = (function(str) {
        var m,
            i = 0,
            urls = [], 
            rex = /<img.*?src="([^">]*\/([^">]*?))".*?>/g;

        while ( (m = rex.exec( str )) !== null && i < 6 ) {
            urls.push( m[1] );
            i++;
        }

        return urls.join('|');
    })(this.content);
};

Experience.pre('remove', function(next) {
    var self = this;
    async.parallel([
        function(cb) {
            self.model('Account').update({ 
                "experiences": self._id
            }, { $pull: { "experiences": self._id } }, function(err, users) {
                if (err) {
                    return cb(err);
                }

                cb(null);
            });
        },
        function(cb) {
            self.model('Dream').update({ 
                "experiences": self._id
            }, { $pull: { "experiences": self._id } }, function(err, dreams) {
                if (err) {
                    return cb(err);
                }

                cb(null);
            });
        }], function(err) {
            if (err) return next(err);
            next(null);
        }
    );
});

module.exports = mongoose.model('Experience', Experience);
