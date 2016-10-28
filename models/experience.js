var mongoose = require('mongoose')
    , async = require("async")

    , Schema = mongoose.Schema;

var Experience = new Schema({
    content    : { type: String, required: true, minlength: 1, trim: true },
    category   : { type: Number, reqiured: true, default: 3 },
    author     : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    _belong_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d  : { type: Schema.Types.ObjectId, ref: 'Dream' },
    comments   : [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    supporters : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    opponents  : [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    date       : { type: Date, default: Date.now }
});

Experience.index({'supporters': 1});
Experience.index({'opponents': 1});

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
