var mongoose = require('mongoose')
, async      = require("async")
, db         = require('./db')
, Schema     = mongoose.Schema;

var Tag = new Schema({
    key         : { type: String, unique: true, index: true, required: true, minlength: 1, maxlength: 12, trim: true, dropDups: true },
    accounts    : [{ type: Schema.Types.ObjectId, ref: 'Account', unique: true }],
    activity    : [{ type: Schema.Types.ObjectId, ref: 'Activity', unique: true }],
    dreams      : [{ type: Schema.Types.ObjectId, ref: 'Dream', unique: true }],
    suggests    : [{ type: Schema.Types.ObjectId, ref: 'Suggest', unique: true }],
    experiences : [{ type: Schema.Types.ObjectId, ref: 'Experience', unique: true }],
    date        : { type: Date, default: Date.now }
});

Tag.index({'accounts':1});
Tag.index({'experiences':1});
Tag.index({'experiences':1});
Tag.index({'suggests':1});

Tag.statics.create = function(tags, type, callback) {
    mongoose.connection.once("open", function(err, conn) {
        // body of program in here
        var bulk = Tag.collection.initializeUnorderedBulkOp();

        // representing a long loop
        var dreams = [];
        tags.forEach(function(tag) {
            bulk.find({ key: tag.key })
                .upsert()
                .updateOne({
                    $set: { 'key': tag.key }, 
                    $addToSet: elm
                });
            dreams.push(tag.rel_id);
        });

        var elm = {};
            elm[type.toLowerCase() + 's'] = { $each: dreams };


        async.parallel([
            function(cb) {
                this.model(type)
                    .update({ _id: tag.rel_id}, {$addToSet: {'dreams': dreams}})
                    .exec(function(err, res) {
                        if (err) return cb(err, null);
                        cb(null, res);
                    });
            },
            function(cb) {
                bulk.execute(function(err, res) {
                    if (err) return cb(err, null);
                    cb(null, res);
                });
            }], function(err, res) {
                if (err) return cb(err, null);
                callback(null, res);
            });
    }.bind(this));
}
Tag.plugin(db);
module.exports = mongoose.model('Tag', Tag);
