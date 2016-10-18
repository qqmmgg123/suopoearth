var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var DComment = new Schema({
    isreply   : { type: Boolean, default: false},
    author    : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    other     : { type: String, minlength: 2, maxlength: 12, trim: true },
    content   : { type: String, required: true, minlength: 1, maxlength: 140, trim: true },
    _belong_u : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d : { type: Schema.Types.ObjectId, ref: 'Dream' },
    _reply_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _reply_c  : { type: Schema.Types.ObjectId, ref: 'Comment' },
    supporters: [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    opponents : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    date      : { type: Date, default: Date.now }
});

DComment.index({'supporters':1});
DComment.index({'opponents':1});

DComment.pre('remove', function(next) {
    var self = this;

    self.model('Dream').update({ 
        "comments": self._id
    }, { $pull: { "comments": self._id } }, function(err, nodes) {
        if (err) {
            return next(err);
        }

        next(null);
    });
});

module.exports = mongoose.model('DComment', DComment);

