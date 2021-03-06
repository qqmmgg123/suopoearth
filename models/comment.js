var mongoose = require('mongoose')
, Schema = mongoose.Schema
, settings = require('../public/const/settings');

var Comment = new Schema({
    isreply   : { type: Boolean, default: false},
    author    : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    other     : { type: String, minlength: 2, maxlength: 12, trim: true },
    content   : { type: String, required: true, minlength: 1, maxlength: 140, trim: true },
    category  : { type: Number, reqiured: true },
    _belong_u : { type: Schema.Types.ObjectId, ref: 'Account' },
    _belong_d : { type: Schema.Types.ObjectId, ref: 'Dream' },
    _belong_n : { type: Schema.Types.ObjectId, ref: 'Node' },
    _belong_e : { type: Schema.Types.ObjectId, ref: 'Experience' },
    _belong_s : { type: Schema.Types.ObjectId, ref: 'Suggest'},
    _reply_u  : { type: Schema.Types.ObjectId, ref: 'Account' },
    _reply_c  : { type: Schema.Types.ObjectId, ref: 'Comment' },
    supporters: [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    opponents : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    date      : { type: Date, default: Date.now }
});

Comment.index({'supporters':1});
Comment.index({'opponents':1});

Comment.pre('remove', function(next) {
    var self = this,
        objType  = 'Node';

    switch (self.category) {
        case settings.OBJEXT_TYPE.NODE:
            objType = 'Node';
            break;
        case settings.OBJEXT_TYPE.SUGGEST:
            objType = 'Suggest';
            break;
        case settings.OBJEXT_TYPE.EXPERIENCE:
            objType = 'Experience';
            break;
        default:
            break;
    }

    self.model(objType).update({ 
        "comments": self._id
    }, { $pull: { "comments": self._id } }, function(err, nodes) {
        if (err) {
            return next(err);
        }

        next(null);
    });
});

module.exports = mongoose.model('Comment', Comment);
