var mongoose = require('mongoose')
    , async = require("async")

    , Schema = mongoose.Schema;

var Node = new Schema({
    content    : { type: String, required: true, minlength: 1, maxlength: 140, trim: true },
    author     : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    comments   : [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    supporters : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    opponents  : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    date       : { type: Date, default: Date.now }
});

Node.index({'supporters': 1});
Node.index({'opponents': 1});

Node.pre('remove', function(next) {
    var self = this;
    async.parallel([
        function(cb) {
            self.model('Account').update({ 
                "nodes": self._id
            }, { $pull: { "nodes": self._id } }, function(err, users) {
                if (err) {
                    return cb(err);
                }

                cb(null);
            });
        },
        function(cb) {
            self.model('Dream').update({ 
                "nodes": self._id
            }, { $pull: { "nodes": self._id } }, function(err, dreams) {
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

module.exports = mongoose.model('Node', Node);
