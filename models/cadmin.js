var mongoose = require('mongoose');
var async = require("async");
var crypto = require('crypto');
var LocalStrategy = require('passport-local').Strategy;
var errors = require('./errors.js');
var scmp = require('scmp');
var semver = require('semver');
var randtoken = require('rand-token');
var nodemailer = require('nodemailer');

var pbkdf2DigestSupport = semver.gte(process.version, '0.12.0');

module.exports = function(schema, options) {
    options = options || {};
    options.saltlen = options.saltlen || 32;
    options.iterations = options.iterations || 25000;
    options.keylen = options.keylen || 512;
    options.encoding = options.encoding || 'hex';
    options.digestAlgorithm = options.digestAlgorithm || 'sha256'; // To get a list of supported hashes use crypto.getHashes()
    options.passwordValidator = options.passwordValidator || function(password, cb) { cb(null); };
    options.URLFieldName = options.URLFieldName || 'GENERATED_VERIFYING_URL';
    options.tempUserCollection =  options.tempUserCollection || 'temporary_users';
    options.expirationTime = options.expirationTime || 86400 * 7;
    options.URLLength = options.URLLength || 48;

    // Populate field names with defaults if not set
    options.usernameField = options.usernameField || 'username';
    options.usernameUnique = options.usernameUnique === undefined ? true : options.usernameUnique;

    // Populate username query fields with defaults if not set,
    // otherwise add username field to query fields.
    if (options.usernameQueryFields) {
        options.usernameQueryFields.push(options.usernameField);
    } else {
        options.usernameQueryFields = [options.usernameField];
    }

    // option to convert username to lowercase when finding
    options.usernameLowerCase = options.usernameLowerCase || false;

    options.hashField = options.hashField || 'hash';
    options.saltField = options.saltField || 'salt';

    if (options.limitAttempts) {
        options.lastLoginField = options.lastLoginField || 'last';
        options.attemptsField = options.attemptsField || 'attempts';
        options.interval = options.interval || 100; // 100 ms
        options.maxInterval = options.maxInterval || 300000; // 5 min
        options.maxAttempts = options.maxAttempts || Infinity;
    }

    options.errorMessages = options.errorMessages || {};
    options.errorMessages.MissingPasswordError = options.errorMessages.MissingPasswordError || '密码没有输入';
    options.errorMessages.AttemptTooSoonError = options.errorMessages.AttemptTooSoonError || '帐号被锁住，请一会再尝试';
    options.errorMessages.TooManyAttemptsError = options.errorMessages.TooManyAttemptsError || '由于你尝试多次登录失败，您的帐号暂时被锁';
    options.errorMessages.NoSaltValueStoredError = options.errorMessages.NoSaltValueStoredError || 'Authentication not possible. No salt value stored';
    options.errorMessages.IncorrectPasswordError = options.errorMessages.IncorrectPasswordError || '密码输入错误';
    options.errorMessages.IncorrectOldPasswordError = options.errorMessages.IncorrectOldPasswordError || '旧密码输入错误';
    options.errorMessages.PasswordSameError = options.errorMessages.PasswordSameError || '新密码不能与旧密码相同';
    options.errorMessages.IncorrectUsernameError = options.errorMessages.IncorrectUsernameError || '您输入的用户不存在';

    var pbkdf2 = function(password, salt, cb) {
        if (pbkdf2DigestSupport) {
            crypto.pbkdf2(password, salt, options.iterations, options.keylen, options.digestAlgorithm, cb);
        } else {
            crypto.pbkdf2(password, salt, options.iterations, options.keylen, cb);
        }
    };

    var schemaFields = {};

    if (!schema.path(options.usernameField)) {
        schemaFields[options.usernameField] = {type: String, unique: options.usernameUnique};
    }
    schemaFields[options.hashField] = {type: String, select: false};
    schemaFields[options.saltField] = {type: String, select: false};

    if (options.limitAttempts) {
        schemaFields[options.attemptsField] = {type: Number, default: 0};
        schemaFields[options.lastLoginField] = {type: Date, default: Date.now};
    }

    if (!schema.path(options.URLFieldName)) {
        schemaFields[options.URLFieldName] = String;
        schemaFields.isAuthenticated = false;
    }

    schema.add(schemaFields);

    if (options.usernameLowerCase) {
        schema.pre('save', function(next) {
            if (this[options.usernameField]) {
                this[options.usernameField] = this[options.usernameField].toLowerCase();
            }

            next();
        });
    }

    schema.methods.setPassword = function(password, cb) {
        if (!password) {
            return cb(new errors.MissingPasswordError(options.errorMessages.MissingPasswordError));
        }

        var self = this;

        options.passwordValidator(password, function(err) {
            if (err) {
                return cb(err);
            }

            crypto.randomBytes(options.saltlen, function(randomBytesErr, buf) {
                if (randomBytesErr) {
                    return cb(randomBytesErr);
                }

                var salt = buf.toString(options.encoding);

                pbkdf2(password, salt, function(pbkdf2Err, hashRaw) {
                    if (pbkdf2Err) {
                        return cb(pbkdf2Err);
                    }

                    self.set(options.hashField, new Buffer(hashRaw, 'binary').toString(options.encoding));
                    self.set(options.saltField, salt);

                    cb(null, self);
                });
            });
        });
    };

    function authenticate(user, password, cb) {
        if (options.limitAttempts) {
            var attemptsInterval = Math.pow(options.interval, Math.log(user.get(options.attemptsField) + 1));
            var calculatedInterval = (attemptsInterval < options.maxInterval) ? attemptsInterval : options.maxInterval;

            if (Date.now() - user.get(options.lastLoginField) < calculatedInterval) {
                user.set(options.lastLoginField, Date.now());
                user.save();
                return cb(null, false, new errors.AttemptTooSoonError(options.errorMessages.AttemptTooSoonError));
            }

            if (user.get(options.attemptsField) >= options.maxAttempts) {
                return cb(null, false, new errors.TooManyAttemptsError(options.errorMessages.TooManyAttemptsError));
            }
        }

        if (!user.get(options.saltField)) {
            return cb(null, false, new errors.NoSaltValueStoredError(options.errorMessages.NoSaltValueStoredError));
        }

        pbkdf2(password, user.get(options.saltField), function(err, hashRaw) {
            if (err) {
                return cb(err);
            }

            var hash = new Buffer(hashRaw, 'binary').toString(options.encoding);

            if (scmp(hash, user.get(options.hashField))) {
                if (options.limitAttempts) {
                    user.set(options.lastLoginField, Date.now());
                    user.set(options.attemptsField, 0);
                    user.save();
                }
                return cb(null, user);
            } else {
                if (options.limitAttempts) {
                    user.set(options.lastLoginField, Date.now());
                    user.set(options.attemptsField, user.get(options.attemptsField) + 1);
                    user.save(function(saveErr) {
                        if (saveErr) { return cb(saveErr); }
                        if (user.get(options.attemptsField) >= options.maxAttempts) {
                            return cb(null, false, new errors.TooManyAttemptsError(options.errorMessages.TooManyAttemptsError));
                        } else {
                            return cb(null, false, new errors.IncorrectPasswordError(options.errorMessages.IncorrectPasswordError));
                        }
                    });
                } else {
                    return cb(null, false, new errors.IncorrectPasswordError(options.errorMessages.IncorrectPasswordError));
                }
            }
        });

    }

    // 更新密码
    schema.methods.updatePassword = function(password_old, password_new, cb) {
        var self = this;
        if (!this.get(options.saltField)) {
            var err = new errors.NoSaltValueStoredError(options.errorMessages.NoSaltValueStoredError);
            return cb(err);
        }

        pbkdf2(password_old, self.get(options.saltField), function(err, hashRaw) {
            if (err) {
                return cb(err);
            }

            var hash = new Buffer(hashRaw, 'binary').toString(options.encoding);

            if (scmp(hash, self.get(options.hashField))) {
                if (password_old == password_new) {
                    var err = new errors.PasswordSameError(options.errorMessages.PasswordSameError);
                    return cb(err);
                }

                self.setPassword(password_new, function(setPasswordErr, user) {
                    if (setPasswordErr) {
                        return cb(setPasswordErr);
                    }

                    self.save(function(saveErr) {
                        if (saveErr) {
                            return cb(saveErr);
                        }

                        cb(null);
                    });
                });
            } else {
                var err = new errors.IncorrectOldPasswordError(options.errorMessages.IncorrectOldPasswordError);
                return cb(err);
            }
        });
    }

    schema.methods.authenticate = function(password, cb) {
        var self = this;

        // With hash/salt marked as "select: false" - load model including the salt/hash fields form db and authenticate
        if (!self.get(options.saltField)) {
            self.constructor.findByUsername(self.get(options.usernameField), true, function(err, user) {
                if (err) { return cb(err); }

                if (user) {
                    return authenticate(user, password, cb);
                } else {
                    return cb(null, false, new errors.IncorrectUsernameError(options.errorMessages.IncorrectUsernameError));
                }
            });
        } else {
            return authenticate(self, password, cb);
        }
    };

    if (options.limitAttempts) {
        schema.methods.resetAttempts = function(cb) {
            this.set(options.attemptsField, 0);
            this.save(cb);
        };
    }

    schema.statics.authenticate = function() {
        var self = this;

        return function(username, password, cb) {
            self.findByUsername(username, true, function(err, user) {
                if (err) { return cb(err); }

                if (user) {
                    return user.authenticate(password, cb);
                } else {
                    return cb(null, false, new errors.IncorrectUsernameError(options.errorMessages.IncorrectUsernameError));
                }
            });
        };
    };

    schema.statics.serializeUser = function() {
        return function(user, cb) {
            cb(null, user.get(options.usernameField));
        };
    };

    schema.statics.deserializeUser = function() {
        var self = this;

        return function(username, cb) {
            self.findByUsername(username, cb);
        };
    };

    function getNestedValue(obj, path, def) {
        var i, len;

        for (i = 0, path = path.split('.'), len = path.length; i < len; i++) {
            if (!obj || typeof obj !== 'object') {
                return def;
            }
            obj = obj[path[i]];
        }

        if (obj === undefined) {
            return def;
        }
        return obj;
    };

    schema.statics.createUser = function(domain, user, password, cb) {
        if (domain) {
            options.verificationURL = domain + '/email-verification/${URL}';
        }

        // Create an instance of this in case user isn't already an instance
        if (!(user instanceof this)) {
            user = new this(user);
        }

        if (!user.get(options.usernameField)) {
            return cb(new errors.MissingUsernameError(options.errorMessages.MissingUsernameError));
        }

        var self = this;

        self.findByUsername(user.get(options.usernameField), function(err, existingUser) {
            if (err) { return cb(err); }

            if (existingUser) {
                return cb(new errors.UserExistsError(options.errorMessages.UserExistsError));
            }

            user.setPassword(password, function(setPasswordErr, user) {
                if (setPasswordErr) {
                    return cb(setPasswordErr);
                }

                user[options.URLFieldName] = randtoken.generate(options.URLLength);
                user.createdAt = new Date();
                user.isAuthenticated = false;
                user.save(function(saveErr) {
                    if (saveErr) {
                        console.log(saveErr);
                        return cb(saveErr);
                    }

                    cb(null, user);
                });
            });
        });
    };

    schema.statics.resetPassword = function(token, password, cb) {
        var self = this;

        self.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
            if (err) { return cb(err, null); }

            if (!user) {
                var err = new errors.UserNotExistsError(options.errorMessages.UserNotExistsError);
                return cb(err, null);
            }

            user.setPassword(password, function(setPasswordErr, user) {
                if (setPasswordErr) {
                    return cb(setPasswordErr, null);
                }

                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                user.save(function(saveErr) {
                    if (saveErr) {
                        return cb(saveErr, null);
                    }

                    cb(null, user);
                });
            });
        });
    };


    schema.statics.findByUsername = function(username, selectHashSaltFields, cb) {
        if (typeof cb === 'undefined') {
            cb = selectHashSaltFields;
            selectHashSaltFields = false;
        }

        // if specified, convert the username to lowercase
        if (username !== undefined && options.usernameLowerCase) {
            username = username.toLowerCase();
        }

        // Add each username query field
        var queryOrParameters = [];
        for (var i = 0; i < options.usernameQueryFields.length; i++) {
            var parameter = {};
            parameter[options.usernameQueryFields[i]] = username;
            queryOrParameters.push(parameter);
        }

        var query = this.findOne({$or: queryOrParameters});

        if (selectHashSaltFields) {
            query.select('+' + options.hashField + " +" + options.saltField);
        }

        if (options.selectFields) {
            query.select(options.selectFields);
        }

        if (options.populateFields) {
            query.populate(options.populateFields);
        }

        if (cb) {
            query.exec(cb);
        } else {
            return query;
        }
    };

    schema.statics.createStrategy = function() {
        return new LocalStrategy(options, this.authenticate());
    };
};

module.exports.errors = errors;

