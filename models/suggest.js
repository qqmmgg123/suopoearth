var mongoose = require('mongoose')
    , async = require("async")
    , striptags = require('../striptags')
    , Schema = mongoose.Schema;

var Suggest = new Schema({
    content    : { type: String, required: true, minlength: 1 },
    summary    : { type: String, required: true, minlength: 1, maxlength: 150, trim: true },
    images     : { type: String },
    author     : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    category   : { type: Number, reqiured: true, default: 2 },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    comments   : [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    tags       : [{ type: Schema.Types.ObjectId, ref: 'Tag', unique: true }],
    supporters : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    opponents  : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    date       : { type: Date, default: Date.now }
});

Suggest.index({'tags': 1});
Suggest.index({'supporters': 1});
Suggest.index({'opponents': 1});

Suggest.methods.extract = function() {
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

Suggest.pre('remove', function(next) {
    var self = this;
    async.parallel([
        function(cb) {
            self.model('Account').update({ 
                "suggests": self._id
            }, { $pull: { "suggests": self._id } }, function(err, users) {
                if (err) {
                    return cb(err);
                }

                cb(null);
            });
        },
        function(cb) {
            self.model('Dream').update({ 
                "suggests": self._id
            }, { $pull: { "suggests": self._id } }, function(err, dreams) {
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

module.exports = mongoose.model('Suggest', Suggest);

