var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var Dream = new Schema({
    title       : { type: String, required: true, minlength: 1, maxlength: 100, trim: true },
    description : { type: String, minlength: 1, maxlength: 140, trim: true },
    author      : { type: String, required: true, minlength: 2, maxlength: 12, trim: true },
    _belong_u   : { type: Schema.Types.ObjectId, ref: 'Account'},
    accounts    : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    _followers_u: [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    nodes       : [{type: Schema.Types.ObjectId, ref: 'Node', unique: true }],
    comments    : [{ type: Schema.Types.ObjectId, ref: 'Comment', unique: true }],
    supporters  : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    opponents   : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    tags        : [{ type: Schema.Types.ObjectId, ref: 'Tag', unique: true }],
    date        : { type: Date, default: Date.now },
    sharestate  : { type: Number, default: 0, required: true} // 0.public 1.private
});

Dream.index({'nodes':1});
Dream.index({'accounts':1});
Dream.index({'_followers_u':1});
Dream.index({'nodes':1});
Dream.index({'comments':1});
Dream.index({'supporters':1});
Dream.index({'opponents':1});
Dream.index({'tags':1});
module.exports = mongoose.model('Dream', Dream);
