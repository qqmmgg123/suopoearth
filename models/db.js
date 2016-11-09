var async = require("async")

module.exports = function(schema, options) {
    schema.statics.random = function(select, limit, callback) {
        this.count(function(err, count) {
            if (err) {
                return callback(err);
            }
            var rand = Math.floor(Math.random() * count),
                diff = rand + limit  - count;
            if (diff <= 0) {
                this.find({}, select)
                    .lean()
                    .skip(rand)
                    .limit(limit)
                    .exec(callback);
            }else{
                async.parallel([
                    function(cb) {
                        this.find({}, select)
                            .lean()
                            .skip(rand)
                            .limit(1)
                            .exec(function(err, record) {
                                if (err) {
                                    return cb(err, []);
                                }
                                cb(null, record);
                            });
                    }.bind(this),
                    function(cb) {
                        this.find({}, select)
                            .lean()
                            .limit(Math.abs(diff))
                            .exec(function(err, records) {
                                if (err) {
                                    return cb(err, []);
                                }
                                cb(null, records);
                            });
                    }.bind(this)
                ], function(err, res) {
                    if (err) {
                        return callback(err, []);
                    }
                    var records = res[0].concat(res[1]);
                    callback(null, records);
                });
            }
        }.bind(this));
    };
}
