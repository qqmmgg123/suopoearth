module.exports = function(schema, options) {
    function getNum(res) {
        if (res.supporters && res.opponents) {
            var num = res.supporters.length - res.opponents.length;
            return num;
        }
        return 0;
    }

    schema.methods.good = function(user, cb) {
        this.supporters.push(user);
        this.save(function(err, res) {
            if (err) {
                return cb(err, 0);
            }

            cb(null, getNum(res));
        });
    }

    schema.methods.bad = function(user, cb) {
        this.opponents.push(user);
        this.save(function(err, res) {
            if (err) {
                return cb(err, 0);
            }

            cb(null, getNum(res));
        });
    }

    schema.methods.cancelGood = function(user, cb) {
        this.supporters.remove(user);
        this.save(function(err) {
            if (err) {
                return cb(err, 0);
            }

            cb(null, getNum(res));
        });
    }

    schema.methods.cancelBad = function(user, cb) {
        this.opponents.remove(user);
        this.save(function(err) {
            if (err) {
                return cb(err, 0);
            }

            cb(null, getNum(res));
        });
    }
}
