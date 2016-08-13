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
    options.expirationTime = options.expirationTime || 86400;
    options.URLLength = options.URLLength || 48;

    // email verification options
    options.verificationURL = options.verificationURL || 'http://www.suopoerath.com/email-verification/${URL}';
    options.transportOptions =  options.transportOptions || {
        host: 'smtp.gmail.com',
        port: 465,
        service: 'Gmail',
        auth: {
            user: 'qqmmgg123@gmail.com',
            pass: 'Suopoearth123'
        },
        //proxy: 'http://dev-proxy.oa.com:8080/'
        proxy: 'http://127.0.0.1:8087'
    };
    options.verifyMailOptions = options.verifyMailOptions || {
        from: 'Do Not Reply <qqmmgg123@gmail.com>',
        subject: 'Confirm your account',
        html: '<p>Please verify your account by clicking <a href="${URL}">this link</a>. If you are unable to do so, copy and ' +
            'paste the following link into your browser:</p><p>${URL}</p>',
        text: 'Please verify your account by clicking the following link, or by copying and pasting it into your browser: ${URL}'
    };
    options.shouldSendConfirmation = true,
    options.confirmMailOptions = options.confirmMailOptions || {
        from: 'Do Not Reply <user@gmail.com>',
        subject: 'Successfully verified!',
        html: '<p>Your account has been successfully verified.</p>',
        text: 'Your account has been successfully verified.'
    };

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
    options.errorMessages.IncorrectUsernameError = options.errorMessages.IncorrectUsernameError || '您输入的用户不存在';
    options.errorMessages.MissingUsernameError = options.errorMessages.MissingUsernameError|| '用户名没有输入';
    options.errorMessages.UserExistsError = options.errorMessages.UserExistsError|| '该邮箱已经被注册';
    options.errorMessages.UserNotExistsError = options.errorMessages.UserNotExistsError|| '该邮箱对应的用户不存在，请确认后再输入';
    options.errorMessages.TempUserExistsError = options.errorMessages.TempUserExistsError|| '该邮箱已经被使用';
    options.errorMessages.TempUserNotFoundError = options.errorMessages.TempUserNotFoundError|| '邮箱认证失败，您的认证地址可能已经过期';

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

        // create a TTL
        schemaFields.createdAt = {
            type: Date,
            expires: options.expirationTime.toString() + 's'
        };
    }

    schemaFields.resetPasswordToken = String;
    schemaFields.resetPasswordExpires = Date;

    schema.add(schemaFields);

    var transporter = nodemailer.createTransport(options.transportOptions);

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


    schema.methods.sendVerificationEmail = function(cb) {
        var r = /\$\{URL\}/g;
        var self = this;

        // inject newly-created URL into the email's body and FIRE
        // stringify --> parse is used to deep copy
        var url = self.get(options.URLFieldName);
        var URL = options.verificationURL.replace(r, url),
            mailOptions = JSON.parse(JSON.stringify(options.verifyMailOptions));

        mailOptions.to = self.get(options.usernameField);
        mailOptions.html = mailOptions.html.replace(r, URL);
        mailOptions.text = mailOptions.text.replace(r, URL);

        transporter.sendMail(mailOptions, cb);
    };

    schema.methods.sendConfirmationEmail = function (cb) {
        var self = this;
        var mailOptions = JSON.parse(JSON.stringify(options.confirmMailOptions));
        mailOptions.to = self.get(options.usernameField);
        transporter.sendMail(mailOptions, cb);
    };

    schema.statics.resendVerificationEmail = function (domain, email, cb) {
        if (domain) {
            options.verificationURL = domain + '/email-verification/${URL}';
        }

        var self = this;

        self.findByUsername(email, true, function(err, user) {
            if (err) {
                return cb(err);
            }

            // user found (i.e. user re-requested verification email before expiration)
            if (user) {
                // generate new user token
                user[options.URLFieldName] = randtoken.generate(options.URLLength);
                user.save(function(err) {
                    if (err) {
                        return cb(err);
                    }

                    user.sendVerificationEmail(function(err, info) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null);
                    });
                });

            } else {
                return cb(null, false);
            }
        });
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

    schema.statics.register = function(domain, user, password, cb) {
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

    schema.statics.forgot = function(domain, email, cb) {
        var self = this;

        crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');

            self.findByUsername(email, function(err, user) {
                if (err) { return cb(err, null); }

                if (!user) {
                    var err = new errors.UserNotExistsError(options.errorMessages.UserNotExistsError);
                    return cb(err, null);
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function(err) {
                    if (err) cb(err, null);

                    var mailOptions = {
                        to: user.username,
                        from: 'Do Not Reply <qqmmgg123@gmail.com>',
                        subject: 'Password Reset',
                        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                              'http://' + domain + '/reset/' + token + '\n\n' +
                              'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                    };

                    transporter.sendMail(mailOptions, cb);
                });
            });
        });
    }

    schema.statics.confirmTempUser  = function(url, cb) {
        var self = this;
        var query = {};

        query[options.URLFieldName] = url;

        self.findOne(query, function(err, user) {
            if (err) {
                return cb(err, null);
            }

            if (user) {
                user.isAuthenticated = true;
                user[options.URLFieldName] = undefined;
                user.createdAt = undefined;
                user.save(function(err) {
                    if (err) {
                        return cb(err, null);
                    }

                    cb(null, user);
                });
            } else {
                return cb(new errors.TempUserNotFoundError(options.errorMessages.TempUserNotFoundError));
            }
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
