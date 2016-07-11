var async = require("async")
    , settings = require("./settings")()
    , mongoose = require('mongoose')
    , passport = require('passport')
    , Account = require('./models/account')
    , Dream = require("./models/dream")
    , Node = require("./models/node")
    , Activity = require("./models/activity")
    , Comment = require("./models/comment")
    , Message = require("./models/Message")
    , log = require('util').log
    , router = require('express').Router();

function quote(str) {
    return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
};

function getFlash(req, name) {
    var flash = req.flash(name);
    if (flash && flash.length > 0){
        return flash[0];
    }
    return '';
}

// 主页
router.get('/', function(req, res, next) {
    var einfo = req.flash('emailinfo');
    if (einfo && einfo.length > 0) {
        req.flash('emailinfo', einfo);
        return next();
    }

    if (!req.user) {
        return res.redirect('/found');
    }

    var uid = req.user.id;

    Account.findById(uid)
    .populate([{
            path: 'dreams',
            select: 'title description'
        }, {
            path: '_following_d',
            select: 'title description'
        }])
    .exec(function(err, user) {
        if (err) {
            return next(err);
        }

        var fields = {
            $or: [{
                "_belong_u": { 
                    "$in": user.follows
                }
            }, {
                "_belong_d": {
                    "$in": user._following_d
                }
            }]
        };

        if (req.query && req.query.tab) {
            switch(req.query.tab) {
                case "fuser":
                    fields = {
                        "_belong_u": { 
                            "$in": user.follows
                        }
                    }
                    break;
                case "fdream":
                    fields = {
                        "_belong_d": {
                            "$in": user._following_d
                        }
                    }
                    break;
                 default:
                    break;
            }
        }

        Activity.find(fields)
        .sort('-date')
        .populate([{
                path: '_create_d'
            }, {
                path: '_create_n'
            }, {
                path: '_belong_u'
            }, {
                path: '_belong_d'
        }])
        .exec(function(err, activities) {
            if (err) {
                return next(err);
            }

            res.render('index', {
                user: req.user,
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                data: {
                    activities: activities,
                    fdreams: user._following_d,
                    mdreams: user.dreams
                },
                success: 1
            });
        });
    });
}, function(req, res, next) {
    var einfo = req.flash('emailinfo');

    res.render('authenticate', {
        title : settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        message: einfo,
        user : req.user,
        data : {}
    });
});

// 想法详情页
router.get('/dream/:id', function(req, res, next) {
    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
    }

    var curId = req.params.id;

    async.parallel([
        function(cb) {
            if (!req.user) {
                return cb(null,[]);
            }
            var uid   = req.user.id;

            Message.find({
                '_belong_u': uid
            }).exec(function(err, msgs) {
                if (err) {
                    return cb(null, []);
                }
                cb(null, msgs);
            });
        }, function(cb) {
            var populate = [{
                    path: 'accounts',
                    options: { limit: 6 },
                }, {
                    path: 'nodes',
                    options: { 
                        limit: 20,
                        sort: '-date'
                    }
                }
            ];

            if (req.user) {
                populate.push({
                    path  : '_followers_u',
                    match : { _id: req.user.id},
                    select: "_id",
                    model : Account
                });
            }

            Dream.findOne({
                _id: curId
            })
            .populate(populate)
            .exec(function(err, dream) {
                if (err) {
                    return cb(err, null);
                }
                cb(null, dream);
            });
        }], function(err, results) {
            if (err) {
                var err = new Error("找不到该想法...");
                return next(err);
            }

            if (!results || results.length < 2) {
                return next(new Error("找不到该想法..."));
            }

            var msgs      = results[0],
                dream     = results[1];

            if (msgs && dream) {
                var accounts  = dream.accounts;
                var nodes     = dream.nodes;


                var isfollow = false;
                if (req.user) {
                    isfollow = (dream._followers_u && dream._followers_u.length > 0);
                }

                Account.populate(nodes, { path: '_belong_u' }, function(err, rnodes) {
                    if (err) {
                        return next(err);
                    }

                    if (!rnodes) {
                        var err = new Error("找不到该想法...")
                        return next(err);
                    }

                    async.parallel([
                        function(callback) {
                            Dream.findById(curId, function(err, res) {
                                var userNum = 0;
                            
                                if (res) {
                                    userNum = res.accounts.length;
                                }

                                callback(null, userNum);
                            });
                        },
                        function(callback){
                            Dream
                            .find({
                                _id:{$gt: curId}
                            })
                            .limit(1)
                            .exec(function(err, result){
                                if (err) {
                                    return callback(err, null);
                                }
    
                                var dreams = result;
                                callback(null, dreams);
                            });
                        },
                        function(callback){
                            Dream
                            .find({
                                _id:{$lte: curId}
                            })
                            .sort('-_id')
                            .limit(2)
                            .exec(function(err, result){
                                if (err) {
                                    return callback(err, null);
                                }
    
                                var dreams = result;
                                callback(null, dreams);
                            });
                        }],
                        function(err, results){
                            if (err) return next(err);
    
                            if (!results || results.length < 3) {
                                var err = new Error("找不到该想法...");
                                return next(err);
                            }
                        
                            if (req.user) {
                                var uid = req.user.id;
                                var _uid = mongoose.Types.ObjectId(uid);
                            
                                accounts.forEach(function(account) {
                                    account.isfollow = (account.fans.indexOf(_uid)!== -1);
                                });
                            }

                            var resData = {
                                membercount: results[0],
                                members    : accounts,
                                messages   : msgs,
                                prev       : results[1][0],
                                nodes      : rnodes,
                                current    : results[2][0],
                                next       : results[2][1],
                                isFollow   : isfollow
                            };

                            res.render('dream', {
                                user  : req.user,
                                title : settings.APP_NAME,
                                notice: getFlash(req, 'notice'),
                                data  : resData,
                                success: 1
                            });
                        }
                    );
                });
            }else{
                var unexisterr = new Error("找不到该想法...");
                next(unexisterr);
            }
        }
    );
});

// 获取想法提议
router.get('/dream/:id/comments', function(req, res, next) {
    var curId = req.params.id;

    Comment.find({ _belong_d: curId }).lean().populate({
         path: '_belong_u'
    }).exec(function(err, comments) {
        if (err) {
            return next(err);
        }

        comments.forEach(function(comment) {
            comment.isowner = req.user && (comment._belong_u && comment._belong_u._id.equals(req.user.id));
        });

        res.json({
            isauthenticated: !!req.user,
            comments: comments,
            result: 0
        })
    })
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 获取历程提议
router.get('/node/:id/comments', function(req, res, next) {
    var curId = req.params.id;

    Comment.find({ _belong_n: curId }).lean().populate({
         path: '_belong_u'
    }).exec(function(err, comments) {
        if (err) {
            return next(err);
        }

        comments.forEach(function(comment) {
            comment.isowner = req.user && (comment._belong_u && comment._belong_u._id.equals(req.user.id));
        });

        res.json({
            isauthenticated: !!req.user,
            comments: comments,
            result: 0
        })
    })
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 用户
router.get('/user/:id([a-z0-9]+)', function(req, res, next) {
    var curId = req.params.id;
    var populate = [{
        path: 'dreams',
        select: 'title description'
    }];

    if (req.user) {
        var opt = {
           path  : 'fans',
           match : { _id: req.user.id},
           select: "_id",
           model : Account
        };
        populate.push(opt);
    }

    Account.findOne({_id: curId})
    .populate(populate)
    .exec(function(err, account) {
        var unexisterr = new Error(settings.USER_NOT_EXIST_TIPS);
        if (err) {
            return next(unexisterr);
        };

        if (!account) {
            return next(unexisterr);
        }else{
            var isfollow = false;
            if (req.user) {
                isfollow = (account.fans && account.fans.length > 0);
            }

            var resData = {
                id       : curId,
                name     : account.nickname,
                bio      : account.bio,
                isfollow : isfollow,
                following: account.followers? account.followers.length:0,
                followers: account.fans? account.fans.length:0,
                join_date: account.date.toISOString()
                    .replace(/T/, ' ').replace(/\..+/, '')
            };

            var resRender = function(data) {
                res.render('user', {
                    title: settings.APP_NAME,
                    notice: getFlash(req, 'notice'),
                    user : req.user,
                    data: data,
                    success: 1
                });
            }

            if (req.query && req.query.tab == "activity") {
                Activity.find({
                    "_belong_u": account._id
                })
                .sort('-date')
                .populate([{
                        path: '_create_d'
                    }, {
                        path: '_create_n'
                    }, {
                        path: '_belong_u'
                    }, {
                        path: '_belong_d'
                }])
                .exec(function(err, activities) {
                    if (err) {
                        return next(err);
                    }
                    resData.tab = "activity";
                    resData.activities = activities;
                    resRender(resData);
                });

                return;
            }

            resData.tab = "dream";
            resData.dreams  = account.dreams;
            resRender(resData);
        }
    });
});

// 消息页
router.get('/message/', function(req, res) {
    res.render('message', {
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user,
        data: {
        },
        result: 0
    });
});

// 更改用户资料
router.post('/settings/profile/update', function(req, res, next) {
    if (!req.user) {
        return res.redirect('/signin');
    }

    var uid = req.user.id;

    if (!req.body || !req.body.nickname) {
        var err = new Error("修改内容为空，个人信息更新失败！");
        return next(err);
    }
    var nickname = req.body.nickname,
        bio = req.body.bio? req.body.bio:'';

    Account.findById(uid, function(err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            var err = new Error("网络或者服务器异常，个人信息更新失败！");
            return next(err);
        }

        user.update({
            nickname : nickname,
            bio      : bio
        }, function(err, course) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('/settings/profile');
            }

            req.flash('notice', "个人信息更新完成。");
            res.redirect('/settings/profile');
        });
    });
});

router.post('/settings/emails/reverification', function(req, res) {
    if (!req.user) {
        return res.redirect('/signin');
    }

    var email = req.user.username;

    Account.resendVerificationEmail(req.headers.host, email, function(err) {
        if (err) {
            var err = new Error("发送认证邮件失败, 请点击发送按钮重新发送。");
            req.flash('error', err.message);
            res.redirect('/settings/emails');
        }

        req.flash('notice', "认证邮件已经发送至您的邮箱，请及时确认邮件并按步骤通过认证。");
        res.redirect('/settings/emails');
    });
});

// 用户配置
router.get('/settings', function(req, res) {
    if (!req.user) {
        res.redirect('/signin');
    } else {
        res.redirect('/settings/profile');
    }
});

// 用户资料
router.get('/settings/profile', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    } else {
        Account.findOne({_id: req.user.id}, function(err, account) {
            if (err) {
                return next(err);
            };
            res.render('profile', {
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                user : req.user,
                data: {
                    error: getFlash(req, 'error'),
                    uid: account.id,
                    name: account.nickname,
                    bio: account.bio? account.bio:''
                },
                success: 1
            });
        });
    }
});

// 帐号设置
router.get('/settings/account', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    } else {
        Account.findOne({_id: req.user.id}, function(err, account) {
            if (err) {
                return next(err);
            };

            res.render('account', {
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                user : req.user,
                data: {
                    error: getFlash(req, 'error')
                },
                success: 1
            });
        });
    }
});

// 邮箱设置
router.get('/settings/emails', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    } else {
        if (req.user.isAuthenticated) {
            return next(new Error("您的账号已经通过邮箱认证。"));
        }

        Account.findOne({_id: req.user.id}, function(err, account) {
            if (err) {
                return next(err);
            };

            res.render('emails', {
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                user : req.user,
                data: {
                    error: getFlash(req, 'error')
                },
                success: 1
            });
        });
    }
});

// 发现
router.get('/found', function(req, res) {
    Dream
    .find({})
    .sort('-date')
    .limit(1)
    .exec(function(err, result) {
        if (err) {
            return next(err)
        };

        if (result.length > 0) {
            res.redirect('/dream/' + result[0].id);
        }else{
            res.redirect('/result');
        }
    });
});

// 搜索结果
router.get('/query', function(req, res, next) {
    function reponse(data) {
        res.json('result', {
            data: {
                results: data
            },
            result: 0
        });
    }

    if (!req.body) {
        return reponse([]);
    }

    var query = req.body.query;

    if (typeof query == "string") {
        query = query.trim();
    }else{
        return reponse([]);
    }

    var type = req.query.type || "content";
    
    async.parallel([
        function(cb) {
           Dream
            .find({
                title: new RegExp(quote(query), 'i')
            })
            .limit(5)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                cb(null, results);
            });
        },
        function(cb) {
           Account
            .find({
                nickname: new RegExp(quote(query), 'i')
            })
            .limit(3)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                cb(null, results);
            });
        }
    ], function(err, results) {
        if (err) {
            return reponse([]);
        }

        reponse(results);
    });

    switch(type) {
        case 'content':
            Dream
            .find({
                title: new RegExp(quote(query), 'i')
            })
            .limit(9)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                reponse(0, results);
            });
            break;
        case 'user':
            Account
            .find({
                nickname: new RegExp(quote(query), 'i')
            })
            .limit(9)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                reponse(1, results);
            });
            break;
        default:
            reponse(-1, results);
            break;
    }
});

// 搜索结果
router.get('/result', function(req, res, next) {
    function reponse(type, data) {
        res.render('result', {
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            user : req.user,
            data: {
                type: type,
                results: data
            },
            result: 0
        });
    }

    if (!req.query) {
        return reponse(0, []);
    }

    var query = req.query.query;

    if (typeof query == "string") {
        query = query.trim();
    }else{
        return reponse(0, []);
    }

    var type = req.query.type || "content";

    switch(type) {
        case 'content':
            Dream
            .find({
                title: new RegExp(quote(query), 'i')
            })
            .limit(9)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                reponse(0, results);
            });
            break;
        case 'user':
            Account
            .find({
                nickname: new RegExp(quote(query), 'i')
            })
            .limit(9)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                reponse(1, results);
            });
            break;
        default:
            reponse(-1, results);
            break;
    }
});

// 资源仓库
/*router.get('/store', function(req, res) {
    res.render('store', {
        title: settings.APP_NAME,
        user : req.user,
        data: {
            title: settings.APP_NAME
        },
        success: 1
    });
});*/

// 简介
router.get('/intro', function(req, res) {
    res.render('intro', {
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user,
        data: {
        },
        success: 1
    });
});

// 联系我们
router.get('/contact', function(req, res) {
    res.render('contact', {
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user,
        data: {
        },
        success: 1
    });
});

// 登录页面
router.get('/signin', function(req, res) {
    res.render('signin', {
        title : settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        error:  getFlash(req, 'info'),
        user : req.user
    });
});

// 登录
router.post('/signin', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err) }
        if (!user) {
            req.flash('info', info.message);
            return res.redirect('/signin');
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }

            var redirectTo = req.session.redirectTo ? req.session.redirectTo : '/';
            delete req.session.redirectTo;
            // is authenticated ?
            return res.redirect(redirectTo);
        });
    })(req, res, next);
});

// 注册
router.post('/signup', function(req, res, next) {
    Account.register(req.headers.host, new Account({
        username : req.body.username,
        nickname: req.body.nickname
    }), req.body.password, function(err, tempaccount) {
        if (err) {
            req.flash('signuperror', err.message);
            return res.redirect('/signup');
        }

        tempaccount.sendVerificationEmail(function(err, info) {
            if (err) {
                req.flash('emailinfo', "认证邮件发送失败，请点击重新发送再试一次。");
                return res.redirect('/');
            }

            passport.authenticate('local')(req, res, function() {
                req.flash('emailinfo', "认证邮件已经发送至你的邮箱， 请及时认证否则您帐号将会过期。");
                res.redirect('/');
            });
        });
    });
});

// 密码重设
router.post('/settings/account/pwdupdate', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    }
    var username = req.user.username;

    if (!req.body || !req.body.password_old || !req.body.password_new) {
        var err = new Error("参数传递错误，密码更新失败！");
        return next(err);
    }
    var password_old = req.body.password_old;
    var password_new = req.body.password_new;

    Account.findByUsername(username, true, function(err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            var err = new Error("网络或者服务器异常，更新密码失败！");
            return next(err);
        }

        user.updatePassword(password_old, password_new, function(err) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('/settings/account');
            }

            req.flash('notice', "密码更新成功");
            res.redirect('/settings/account');
        });
    });
});

// 忘记密码
router.get('/forgot', function(req, res) {
    res.render('forgot', {
        error:  getFlash(req, 'error'),
        title : settings.APP_NAME,
        user: req.user
    });
});

// 发送重置邮件
router.post('/forgot', function(req, res, next) {
    Account.forgot(req.headers.host, req.body.email, function(err, info) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/forgot');
        }

        req.flash('emailinfo', "密码重置邮件已经发送至你的邮箱， 请确认重置地址并操作重置您的密码。");
        res.redirect('/');
    });
});

// 重置密码页面
router.get('/reset/:token([A-Za-z0-9]+)', function(req, res) {
    var token = req.params.token;
    Account.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/forgot');
        }

        if (!user) {
            req.flash('error', '密码重置激活码无效，可能已经过期, 请重新发送重置邮件.');
            return res.redirect('/forgot');
        }

        res.render('reset', {
            token : token,
            notice: getFlash(req, 'notice'),
            title : settings.APP_NAME,
            user: req.user
        });
    });
});

// 重置密码
router.post('/reset/:token([A-Za-z0-9]+)', function(req, res, next) {
    var token = req.params.token;
    if (!req.body || !req.body.password) {
        var err = new Error("参数传递错误，密码重置失败！");
        return next(err);
    }
    var password = req.body.password;

    Account.resetPassword(token, password, function(err, user) {
        if (err) {
            req.flash('error', '密码重置激活码无效，可能已经过期, 请重新发送重置邮件.');
            return res.redirect('/forgot');
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            req.flash('emailinfo', "密码重置成功。")
            res.redirect('/');
        });
    });
});

// 邮箱验证
router.get('/email-verification/:token([A-Za-z0-9]+)', function(req, res, next) {
    var token = req.params.token;
    Account.confirmTempUser(token, function(err, account) {
        if (err) return next(err);
        
        req.logIn(account, function(err) {
            if (err) { return next(err); }
            req.flash('emailinfo', "邮箱认证成功。")
            res.redirect('/');
        });
    })
});

// 注册页面
router.get('/signup', function(req, res) {
    res.render('signup', {
        info : getFlash(req, 'signuperror'),
        notice: getFlash(req, 'notice'),
        title : settings.APP_NAME,
        user : req.user
    });
});

// 登出
router.get('/signout', function(req, res) {
    req.logout();
    res.redirect('/');
});

// 建设中
router.get('/building', function(req, res) {
    res.render('building', {
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user
    });
});

// 建设中
router.get('/canvas', function(req, res) {
    res.render('canvas', {
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user
    });
});

// 创建一个想法
router.post('/dream/new', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    }

    var uid = req.user.id;
    var nickname = req.user.nickname;

    if (!req.body) {
        
    }

    if (!req.body.title) {
        return next(new Error("参数传递错误..."));
    }

    if (req.body.title.length > 100 
        || req.body.description.length > 140) {
        return next(new Error("标题或概要字数超出限制范围.."));
    }

    var des = req.body.description;
    
    Account.findOne({_id: uid}, function(err, user) {
        if (err) return next(err);

        if (!user) {
            return next(new Error("发布想法失败..."));
        }

        var fields = {
            _belong_u: uid,
            author   : nickname,
            title: req.body.title,
            description: des? des:""
        };

        if (req.body.sharestate 
                && [0, 1].indexOf(req.body.sharestate) !== -1) {
            fields.sharestate = req.body.sharestate;
        }

        var dream = new Dream(fields);

        dream.accounts.push(user);
        user.dreams.push(dream);

        var newAc = new Activity({
            _belong_u : uid,
            _create_d : dream._id,
            alias     : nickname,
            type      : 0
        });

        async.parallel([
            function(cb_2) {
                dream.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            },
            function(cb_2) {
                user.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            },
            function(cb_2) {
                newAc.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            }
        ], function(err, results) {
            if (err) return next(err);

            res.redirect('/');
        });
    });
});

// 保存一个梦想节点
router.post('/node/new', function(req, res, next) {
    if (!req.user) {
        return res.redirect('/signin');
    }

    var uid = req.user.id;

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamId = req.body.did;
    if (!req.body.content) {
        return next(new Error("您的历程是空内容..."));
    }

    if (req.body.content.length > 140) {
        return next(new Error("内容字数超出限制范围.."));
    }

    async.parallel([
        function(cb){
            Dream.findOne({_id: dreamId}, function(err, dream) {
                if (err) return cb(err, null);

                if (!dream) {
                    var err = new Error("添加历程失败...");
                    return cb(err, null);
                }
                
                cb(null, dream);
            });
        },
        function(cb){
            Account.findOne({_id: uid}, function(err, user) {
                if (err) return cb(err, null);

                if (!user) {
                    var err = new Error("添加历程失败...");
                    return cb(err, null);
                }
                
                cb(null, user);
            });
        }],
        function(err, results){
            if (err) return next(err);

            if (!results || results.length < 2) {
                var err = new Error("添加历程失败...");
                return next(err);
            }

            var dream = results[0];
            var user = results[1];

            var node = new Node({
                _belong_d: dream._id,
                _belong_u: user._id,
                author   : user.nickname,
                content  : req.body.content
            });

            node.save(function(err) {
                if (err) return next(err);

                dream.nodes.push(node);
                user.nodes.push(node);

                var newAc = new Activity({
                    _belong_u : user._id,
                    _belong_d : dream._id,
                    _create_n : node._id,
                    alias     : user.nickname,
                    type      : 1
                });

                async.parallel([
                        function(cb_2) {
                            dream.save(function(err) {
                                if (err) return cb_2(err, null);
                                cb_2(null, null);
                            });
                        },
                        function(cb_2) {
                            user.save(function(err) {
                                if (err) return cb_2(err, null);
                                cb_2(null, null);
                            });
                        },
                        function(cb_2) {
                            newAc.save(function(err) {
                                if (err) return cb_2(err, null);
                                cb_2(null, null);
                            });
                        }
                    ], function(err, results) {
                        if (err) return next(err);

                        res.redirect('/dream/' + dream._id);
                });
            });
        }
    );
});

// 删除想法
router.post('/dream/delete', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    Dream.findById(dreamID, function(err, dream) {
        if (err) return next(err);

        if (!dream) {
            var err = new Error("删除想法失败...");
            return next(err);
        }
        
        dream.remove(function(err) {
            if (err) {
                var err = new Error("删除想法失败...");
                return next(err);
            }

            res.json({
                info: "删除想法成功",
                result: 0
            });
        });
    });
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 编辑想法
router.post('/dream/modify', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    }

    var uid = req.user.id;

    if (!req.body || !req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did,
        fields  = {},
        title   = req.body.title,
        des     = req.body.description;

    if (title) {
        fields.title = title;
    }else{
        return next(new Error("标题不能不能不填..."))
    }
    if (des) fields.description = des? des:"";

    Dream.findOneAndUpdate(
        { _id: dreamID },
        { 
            $set: fields
        }, 
        { new: true }, function(err, dream) {
            if (err) return next(err);

            res.redirect('/dream/' + dream.id);
        }
    );
});

router.post('/dream/out', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    var isdream, isuser;
    async.parallel([
        function() {
            Account.findById(uid, function(err, user) {
                if (err) return next(err);

                if (!user) {
                    var err = new Error("删除想法失败...");
                    return cb(err, null);
                }
                
                isdream = user.dreams.filter(function (dream) {
                    return dream.equals(dreamID);
                }).pop();

                cb(null, user);
            })
        },
        function() {
            Dream.findById(dreamID, function(err, dream) {
                if (err) return cb(err, null);

                if (!dream) {
                    var err = new Error("删除想法失败...");
                    return cb(err, null);
                }
                
                isuser = dream.accounts.filter(function (user) {
                    return user.equals(uid);
                }).pop();

                cb(null, dream);
            })
        }
    ], function(err, results) {
        if (err) return next(err);

        if (!results || results.length < 2) {
            var err = new Error("删除想法失败...");
            return next(err);
        }

        var user = results[0];
        var dream = results[1];

        if (!isfollow && !isfans) {
            return next(new Error("你没有添加该想法..."));
        }

        user.dreams.remove(dream);
        dream.accounts.remove(user);

        async.parallel([
            function(cb_2) {
                user.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            },
            function(cb_2) {
                dream.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            }
            ], function(err, results) {
                if (err) return next(err);

                return res.json({
                    info: "退出想法成功",
                    result: 0
                });
            }
        );
    });
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

router.post('/dream/join', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;
    
    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    var isdream, isuser;
    async.parallel([
        function(cb) {
            Account.findById(uid, function(err, user) {
                if (err) return next(err);

                if (!user) {
                    var err = new Error("添加想法失败...");
                    return cb(err, null);
                }
                
                isdream = user.dreams.filter(function (dream) {
                    return dream.equals(dreamID);
                }).pop();

                cb(null, user);
            });
        },
        function(cb) {
            Dream.findById(dreamID, function(err, dream) {
                if (err) return cb(err, null);

                if (!dream) {
                    var err = new Error("添加想法失败...");
                    return cb(err, null);
                }
                
                isuser = dream.accounts.filter(function (user) {
                    return user.equals(uid);
                }).pop();

                cb(null, dream);
            });
        }], function(err, results) {
            if (err) return next(err);

            if (!results || results.length < 2) {
                var err = new Error("添加想法失败...");
                return next(err);
            }

            var user = results[0];
            var dream = results[1];

            if (dream.sharestate !== 0) {
                return next(new Error("该想法发起者没有给予共享，您不参与。"));
            }

            if (isdream || isuser) {
                if (isdream && isuser) {
                    return next(new Error("你已经添加了对方..."));
                }

                dream.accounts.remove(user);
                user.dreams.remove(dream);
            }

            user.dreams.push(dream);
            dream.accounts.push(user);

            async.parallel([
                function(cb_2) {
                    user.save(function(err) {
                        if (err) return cb_2(err, null);
                        cb_2(null, null);
                    });
                },
                function(cb_2) {
                    dream.save(function(err) {
                        if (err) return cb_2(err, null);
                        cb_2(null, null);
                    });
                }
                ], function(err, results) {
                    if (err) return next(err);

                    return res.json({
                        info: "添加想法成功",
                        result: 0
                    });
            });
        }
    );
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 取消关注想法
router.post('/dream/cfollowing', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    var isdream, isuser;
    async.parallel([
        function(cb) {
            Account.findById(uid, function(err, user) {
                if (err) return next(err);

                if (!user) {
                    var err = new Error("取消关注想法失败...");
                    return cb(err, null);
                }
                
                isdream = user._following_d.filter(function (dream) {
                    return dream.equals(dreamID);
                }).pop();

                cb(null, user);
            })
        },
        function(cb) {
            Dream.findById(dreamID, function(err, dream) {
                if (err) return cb(err, null);

                if (!dream) {
                    var err = new Error("取消关注想法失败...");
                    return cb(err, null);
                }
                
                isuser = dream._followers_u.filter(function (user) {
                    return user.equals(uid);
                }).pop();

                cb(null, dream);
            })
        }
    ], function(err, results) {
        if (err) return next(err);

        if (!results || results.length < 2) {
            var err = new Error("取消关注想法失败...");
            return next(err);
        }

        var user = results[0];
        var dream = results[1];

        if (!isuser && !isdream) {
            return next(new Error("你没有关注该想法..."));
        }

        user._following_d.remove(dream);
        dream._followers_u.remove(user);

        async.parallel([
            function(cb_2) {
                user.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            },
            function(cb_2) {
                dream.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            }
            ], function(err, results) {
                if (err) return next(err);

                return res.json({
                    info: "取消关注想法成功",
                    result: 0
                });
            }
        );
    });
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 关注想法
router.post('/dream/following', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;
    
    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    var isdream, isuser;
    async.parallel([
        function(cb) {
            Account.findById(uid, function(err, user) {
                if (err) return next(err);

                if (!user) {
                    var err = new Error("关注想法失败...");
                    return cb(err, null);
                }
                
                isdream = user._following_d.filter(function (dream) {
                    return dream.equals(dreamID);
                }).pop();

                cb(null, user);
            });
        },
        function(cb) {
            Dream.findById(dreamID, function(err, dream) {
                if (err) return cb(err, null);

                if (!dream) {
                    var err = new Error("关注想法失败...");
                    return cb(err, null);
                }
                
                isuser = dream._followers_u.filter(function (user) {
                    return user.equals(uid);
                }).pop();

                cb(null, dream);
            });
        }], function(err, results) {
            if (err) return next(err);

            if (!results || results.length < 2) {
                var err = new Error("关注想法失败...");
                return next(err);
            }

            var user = results[0];
            var dream = results[1];
            
            if (dream._belong_u.equals(user._id)) {
                return next(new Error("你不能关注自己的想法。"));
            }

            if (isdream || isuser) {
                if (isdream && isuser) {
                    return next(new Error("你已经关注了该想法..."));
                }
            }

            user._following_d.push(dream);
            dream._followers_u.push(user);

            async.parallel([
                function(cb_2) {
                    user.save(function(err) {
                        if (err) return cb_2(err, null);
                        cb_2(null, null);
                    });
                },
                function(cb_2) {
                    dream.save(function(err) {
                        if (err) return cb_2(err, null);
                        cb_2(null, null);
                    });
                }
                ], function(err, results) {
                    if (err) return next(err);

                    return res.json({
                        info: "关注想法成功",
                        result: 0
                    });
            });
        }
    );
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});



router.post('/user/cfollow', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.fid) {
        var err = new Error("取消关注失败");
        return next(err);
    }

    var followId = req.body.fid;

    if (uid === followId) {
        var err = new Error("不能取消关注自己");
    }

    var isfollow, isfans;
    async.parallel([
        function(cb) {
            Account.findById(uid, function(err, user) {
                if (err) return cb(err, null);

                if (!user) {
                    var err = new Error("取消关注失败");
                    return cb(err, null);
                }

                isfollow = user.follows.filter(function (follow) {
                    return follow.equals(followId);
                }).pop();

                cb(null, user);
            });
        },
        function(cb) {
            Account.findById(followId, function(err, user) {
                if (err) return cb(err, null);

                if (!user) {
                    var err = new Error("取消关注失败");
                    return cb(err, null);
                }
                
                isfans = user.fans.filter(function (fans) {
                    return fans.equals(uid);
                }).pop();

                cb(null, user);
            });
        }], function(err, results) {
            if (err) return next(err);

            if (!results || results.length < 2) {
                var err = new Error("取消关注失败");
                return next(err);
            }

            var fans = results[0];
            var follow = results[1];

            if (!isfollow && !isfans) {
                return next(new Error("你没有关注对方..."));
            }

            fans.follows.remove(follow);
            follow.fans.remove(fans);

            async.parallel([
                function(cb_2) {
                    fans.save(function(err) {
                        if (err) return cb_2(err, null);
                        cb_2(null, null);
                    });
                },
                function(cb_2) {
                    follow.save(function(err) {
                        if (err) return cb_2(err, null);
                        cb_2(null, null);
                    });
                }
                ], function(err, results) {
                    if (err) return next(err);

                    return res.json({
                        info: "取消关注成功",
                        result: 0
                    });
                }
            );
        }
    );
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
           result: 1
    });
});

router.post('/user/follow', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.fid) {
        var err = new Error("关注失败");
        return next(err);
    }

    var followId = req.body.fid;

    if (uid === followId) {
        var err = new Error("不能关注自己");
        return next(err);
    }

    var isfollow, isfans;

    async.parallel([
        function(cb) {
            Account.findById(uid, function(err, user) {
                if (err) return cb(err, null);

                if (!user) {
                    var err = new Error("关注失败...");
                    return cb(err, null);
                }
                
                isfollow = user.follows.filter(function (follow) {
                    return follow.equals(followId);
                }).pop();

                cb(null, user);
            });
        },
        function(cb) {
            Account.findById(followId, function(err, user) {
                if (err) return cb(err, null);

                if (!user) {
                    var err = new Error("关注失败...");
                    return cb(err, null);
                }

                isfans = user.fans.filter(function (fans) {
                    return fans.equals(uid);
                }).pop();
                

                cb(null, user);
            });
        }], function(err, results) {
            if (err) return next(err);

            if (!results || results.length < 2) {
                var err = new Error("关注失败...");
                return next(err);
            }

            var fans = results[0];
            var follow = results[1];

            if (isfollow || isfans) {
                if (isfollow && isfans) {
                    return next(new Error("你已经关注了对方..."));
                }
            }
            fans.follows.push(follow);
            follow.fans.push(fans);

            async.parallel([
                function(cb_2) {
                    fans.save(function(err) {
                        if (err) {
                            return cb_2(err, null);
                        }
                        cb_2(null, null);
                    });
                },
                function(cb_2) {
                    follow.save(function(err) {
                        if (err) {
                            return cb_2(err, null);
                        }
                        cb_2(null, null);
                    });
                }
                ], function(err, results) {
                    if (err) {
                        return next(err);
                    }

                    return res.json({
                        info: "关注成功",
                        result: 0
                    });
            });
        }
    );
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 创建评论
router.post('/comment/new', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }
    var uid = req.user.id;
    var nickname = req.user.nickname;

    if (!req.body || !req.body.bl || !req.body.blid || !req.body.did) {
        return next(new Error("请求参数错误，创建失败..."));
    }

    var bl   = req.body.bl;
    var did  = req.body.did;
    var blID = req.body.blid;

    var content = req.body.content;

    if (typeof content !== "string" || !content.trim()) {
        return next(new Error("您的提议是空内容，创建失败..."));
    }

    var promise = null;

    switch(bl) {
        case '0':
            promise = Dream.findOne({_id: blID}).exec();
            break;
        case '1':
            promise = Node.findOne({_id: blID}).exec();
            break;
        default:
            return next(new Error("请求参数错误，创建失败..."));
            break;
    }

    promise.then(function(object) {
        if (!object) {
            var err = new Error("发布提议失败...");
            return next(err);
        }

        var fields = {
            _belong_d: did,
            _belong_u: uid,
            author   : nickname,
            content  : content.trim()
        }

        switch(bl) {
            case '1':
                fields._belong_n = blID;
                break;
            default:
                break;
        }
    
        var comment = new Comment(fields);
        object.comments.push(comment);

        async.parallel([
            function(cb_2) {
                comment.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            },
            function(cb_2) {
                object.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            }
            ], function(err, results) {
                if (err) return next(err);
                res.json({
                    info: "发布成功",
                    isauthenticated: !!req.user,
                    isowner: req.user && comment._belong_u.equals(req.user.id),
                    comment: comment,
                    total: object.comments.length,
                    result: 0
                });
            }
        );
    }).catch(function(err) {
        if (err) return next(err);
    });

}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 创建评论
router.post('/reply/new', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }
    var uid = req.user.id;
    var nickname = req.user.nickname;

    if (!req.body || !req.body.bl || !req.body.did || !req.body.blid 
            || !req.body.toid || !req.body.forid) {
        return next(new Error("请求参数错误，回复失败..."));
    }

    var bl    = req.body.bl
    , did     = req.body.did
    , blID    = req.body.blid
    , toid    = req.body.toid
    , forid   = req.body.forid
    , content = req.body.content;

    if (typeof content !== "string" || !content.trim()) {
        return next(new Error("您的回复是空内容，创建失败..."));
    }

    var promise = null;

    switch(bl) {
        case '0':
            promise = Dream.findOne({_id: blID}).exec();
            break;
        case '1':
            promise = Node.findOne({_id: blID}).exec();
            break;
        default:
            return next(new Error("请求参数错误，回复失败..."));
            break;
    }

    async.parallel([
            function(cb) {
                 promise.then(function(obj) {
                     if (!obj) {
                        var err = new Error("回复失败...");
                        return cb(err, null);
                     }

                     cb(null, obj);
                 }).catch(function(err) {
                     if (err) cb(err, null);
                 });
            },
            function(cb) {
                Account.findById(toid).select('nickname messages').exec(function(err, user) {
                    if (err) {
                        return cb(err, null);
                    }

                    if (!user) {
                        var err = new Error("您回复的用户不存在...");
                        return cb(err, null);
                    }

                    cb(null, user);
                });
            }
    ], function(err, results) {
        if (err || !results || results.length < 2) {
            var err = new Error("回复失败...");
            return next(err);
        }

        var object = results[0];
        var other  = results[1];

        if (!object || !other) {
            var err = new Error("回复失败...");
            return next(err);
        }

        var fields = {
            isreply  : true,
            _belong_d: did,
            _belong_u: uid,
            _reply_u : toid,
            _reply_c : forid,
            author   : nickname,
            other    : other.nickname,
            content  : content.trim(),
        }

        switch(bl) {
            case '1':
                fields._belong_n = blID;
                break;
            default:
                break;
        }
    
        var comment = new Comment(fields);
        object.comments.push(comment);

        async.parallel([
            function(cb_2) {
                comment.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            },
            function(cb_2) {
                object.save(function(err) {
                    if (err) return cb_2(err, null);
                    cb_2(null, null);
                });
            }
            ], function(err, results) {
                if (err) return next(err);
                var url        = '/dream/' + comment._belong_d + '?cid=' + comment.id;

                var msgfields  = {
                    _belong_u: toid,
                    url      : url,
                    title    : '你有新的回复',
                    summary  : comment.content
                }
                
                var message = new Message(msgfields);
                other.messages.push(message);
                async.parallel([
                        function(cb_3) {
                            message.save(function(err) {
                                if (err) return cb_3(err, null);
                                cb_3(null, null);
                            });
                        },
                        function(cb_3) {
                            other.save(function(err) {
                                if (err) return cb_3(err, null);
                                cb_3(null, null);
                            });
                        }
                ], function(err, results) {
                    if (err) return next(err);

                    res.json({
                        info: "发布成功",
                        isauthenticated: !!req.user,
                        isowner: req.user && comment._belong_u.equals(req.user.id),
                        comment: comment,
                        total: object.comments.length,
                        result: 0
                    });
                });
            }
        );
    });
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 删除历程
router.post('/node/delete', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.nid) {
        return next(new Error("请求参数错误..."));
    }

    var nodeID = req.body.nid;

    Node.findById(nodeID, function(err, node) {
        if (err) return next(err);

        if (!node) {
            var err = new Error("删除历程失败...");
            return next(err);
        }
        
        node.remove(function(err) {
            if (err) {
                var err = new Error("删除历程失败...");
                return next(err);
            }

            res.json({
                info: "删除历程成功",
                result: 0
            });
        });
    });

}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

// 删除评论
router.post('/comment/delete', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    Dream.findById(dreamID, function(err, dream) {
        if (err) return next(err);

        if (!dream) {
            var err = new Error("删除想法失败...");
            return next(err);
        }
        
        dream.remove();
    });
}, function(err, req, res, next) {
    if (err) {
        message = err.message;
    }

    return res.json({
        info: message,
        result: 1
    });
});

module.exports = router;
