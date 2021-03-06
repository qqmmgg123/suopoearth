var async = require("async")
    , crypto = require('crypto')
    , fs = require("fs")
    , path = require("path")
    , multer  = require('multer')
    , mime = require("mime")
    , settings = require("./public/const/settings")
    , mongoose = require('mongoose')
    , passport = require('passport')
    , Account = require('./models/account')
    , Dream = require("./models/dream")
    , Node = require("./models/node")
    , Suggest = require("./models/suggest")
    , Experience = require("./models/experience")
    , Activity = require("./models/activity")
    , Comment = require("./models/comment")
    , Tag     = require("./models/tag")
    , Message = require("./models/message")
    , log = require('util').log
    , router = require('express').Router()
    , Promise = require('mpromise');

var maxtime = 1500;

var storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) return cb(err)

            cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
        });
    }
});

var upload = multer({ storage: storage });

function makeCommon(data, res) {
    if (!data.data) {
        data.data = {};
    }
    data.data.messages = res.msgs;
    return data;
}

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

// 获取评论公共接口
function getItemComments(itemId, category, page, user, callback) {
    var curId = itemId,
        query = {};

    switch(category) {
        case settings.OBJEXT_TYPE.NODE:
            query._belong_n = curId;
            break;
        case settings.OBJEXT_TYPE.SUGGEST:
            query._belong_s = curId;
            break;
        case settings.OBJEXT_TYPE.EXPERIENCE:
            query._belong_e = curId;
            break;
        default:
            break;
    }

    var limit = 10;

    var skip = (page - 1) * 10;

    async.parallel([
        function(cb) {
            Comment.count(query, function(err, count) {
                if (err || !count) {
                    return cb(null, 0);
                }

                cb(null, count)
            });
        },
        function(cb) {
            Comment
            .find(query)
            .lean()
            .populate({
                path: '_belong_u'
            })
            .sort('-date')
            .skip(skip)
            .limit(limit)
            .exec(function(err, comments) {
                if (err || !comments) {
                    return cb(null, []);
                }

                cb(null, comments)
            });
        }
    ], function(err, results) {
        if (err || !results || results.length !== 2) {
            return callback(new Error("异常错误。"), null)
        }

        var comments = results[1],
            count    = results[0];

        comments.forEach(function(comment) {
            comment.isowner = user && (comment._belong_u && comment._belong_u._id.equals(user.id));
        });

        callback(null, {
            isauthenticated: !!user,
            count   : count,
            comments: comments
        });
    });
}

// 展示推荐页
// 推荐页
function renderRecommand(req, res) {
    function resData(users, dreams) {
        res.render('pages/recommand', makeCommon({
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            user : req.user,
            data: {
                users: users,
                dreams: dreams
            },
            success: 1
        }, res));
    }

    // 查询耗时测试
    var start = new Date().getTime();

    async.parallel([
        function(cb) {
            Dream
            .find({}, '_id title description nodes _belong_u')
            .populate([{
                path: 'nodes',
                select: "_id content date",
                option: { limit: 6, lean: true, sort: "-date" },
                model: Node
            }, {
                path: '_belong_u',
                select: "_id nickname avatar",
                option: { lean: true },
                model: Account
            }])
            .sort("-date")
            .exec(function(err, dreams) {
                if (err || !dreams) {
                    dreams = [];
                }
                cb(null, dreams);
            });
        },
        function(cb) {
            Account
            .find({}, '_id nickname bio avatar dreams date')
            .lean()
            .populate({
                path  : 'dreams',
                select: "_id title description nodes",
                options: { 
                    limit: 3,
                    populate: {
                        path: 'nodes',
                        select: "_id content date",
                        option: { limit: 6, lean: true, sort: "-date" },
                        model: Node
                    },
                    lean: true
                },
                model : Dream
            })
            .sort("-date")
            .limit(3)
            .exec(function(err, users) {
                if (err || !users) {
                    users = [];
                }
                cb(null, users);
            });
        }
    ], function(err, results) {
        var dreams = [],
            users  = [];

        if (results && results.length === 2) {
            dreams = results[0];
            users = results[1];
        }
        
        var spend = end - start;
        if (spend > maxtime) {
            var end = new Date().getTime();
            console.log(req.originalUrl + ' spend' + spend + 'ms');
        }
        resData(users, dreams);
    });
};

// 主页
router.get('/', function(req, res, next) {
    var einfo = req.flash('emailinfo');
    if (einfo && einfo.length > 0) {
        req.flash('emailinfo', einfo);
        return next(null, req, res, next);
    }

    if (!req.user) {
        return Dream.random('_id title description tags', 1, function(err, dreams) {
            if (err) {
                return next(err, req, res, next);
            }

            if (!dreams || !dreams.length || dreams.length === 0) {
                return next(new Error("抱歉，今天没找不到愿望了！"));
            }

            res.render('pages/index_unlogged', makeCommon({
                user: req.user,
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                data: {
                    current: dreams[0],
                    category: 'suggest'
                },
                success: 1
            }, res));
        });
    }

    // 查询耗时测试
    var start = new Date().getTime();
    var user = req.user,
        uid  = user._id;

        async.parallel([
            function(cb) {
                Dream.find({
                    _belong_u: uid
                }, '_id title description',
                {
                    sort: '-date',
                    limit: 10
                }, function(err, dreams) {
                    if (err || !dreams) {
                        var unKonwErr = new Error('未知错误。')
                        return cb(err || unKonwErr, []);
                    }

                    cb(null, dreams);
                }).lean();
            },
            function(cb) {
                Dream.find({
                    _id: {
                        $in: user._following_d
                    }
                }, '_id title description',
                {
                    sort: '-date',
                    limit: 10
                }, function(err, dreams) {
                    if (err || !dreams) {
                        var unKonwErr = new Error('未知错误。')
                        return cb(err || unKonwErr, []);
                    }

                    cb(null, dreams);
                }).lean();
            },
            function(cb) {
                var fields = {
                    $or: [{
                        "_belong_u": { 
                            "$in": user.follows
                        }
                    }, {
                        "_belong_d": {
                            "$in": user._following_d
                        }
                    }, {
                        "_belong_u": uid
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
                .lean()
                .sort('-date')
                .limit(11)
                .populate([{
                    path: '_create_d',
                    select: '_id title description'
                }, {
                    path: '_create_n',
                    select: '_id content'
                }, {
                    path: '_create_s',
                    select: '_id summary images'
                }, {
                    path: '_create_e',
                    select: '_id summary images'
                }, {
                    path: '_belong_u',
                    select: '_id nickname avatar'
                }, {
                    path: '_belong_d',
                    select: '_id title description'
                }])
                .exec(function(err, activities) {
                    if (err || !activities) {
                        var unKonwErr = new Error('未知错误。')
                        return cb(err || unKonwErr, []);
                    }

                    cb(null, activities);
                });
            }], function(err, results) {
                if (err && results.length < 3) {
                    return next(err, req, res, next);
                }

                var mdreams    = results[0],
                    fdreams    = results[1],
                    activities = results[2];

                var hasmore = false,
                    anext   = 0;
                if (activities[10]) {
                    hasmore = true;
                    anext = activities[10]._id;
                }
                activities = activities.slice(0, 10);

                res.render('pages/index_logged', makeCommon({
                    user: req.user,
                    title: settings.APP_NAME,
                    notice: getFlash(req, 'notice'),
                    data: {
                        activities : activities,
                        fdreams    : fdreams,
                        mdcount    : user.dreams.length,
                        fdcount    : user._following_d.length,
                        mdreams    : mdreams,
                        anext      : anext,
                        hasmore    : hasmore,
                        tab        : (req.query && req.query.tab) || 'all'
                    },
                    success: 1
                }, res));

                var spend = end - start;
                if (spend > maxtime) {
                    var end = new Date().getTime();
                    console.log(req.originalUrl + ' spend' + spend + 'ms');
                }
            });
}, function(err, req, res, next) {
    if (err) return next(err);

    var einfo = req.flash('emailinfo');

    if (einfo) {
        res.render('pages/authenticate', makeCommon({
            title : settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            message: einfo,
            user : req.user,
            data : {
                messages : res.msgs,
            }
        }, res));
    }
});

// 建设中
router.get('/canvas', function(req, res) {
    res.render('pages/canvas', makeCommon({
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user
    }, res));
});

// 建设中
router.get('/guide', function(req, res, next) {
    async.parallel([
        function(cb) {
            Account.random('_id nickname bio avatar', 3, function(err, users) {
                if (err) {
                    return cb(err, []);
                }

                cb(null, users);
            });
        }, function(cb) {
            Dream.random('_id title description', 3, function(err, dreams) {
                if (err) {
                    return cb(err, []);
                }

                cb(null, dreams)
            });
        }, function(cb) {
            Tag.random('_id key', 20, function(err, tags) {
                if (err) {
                    return cb(err, []);
                }

                cb(null, tags);
            });
        }
    ], function(err, ret) {
        if (err) {
            return next(err);
        }

        var users  = ret.length === 3 && ret[0]? ret[0]:[],
            dreams = ret.length === 3 && ret[1]? ret[1]:[],
            tags = ret.length === 3 && ret[2]? ret[2]:[];

        res.render('pages/guide', makeCommon({
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            data: {
                rusers: users,
                rdreams: dreams
            },
            user : req.user
        }, res));
    });
});

// 想法详情页
router.get('/dream/:id([a-z0-9]+)(/:category(node|suggest|experience)(/:itemid([a-z0-9]+))?)?', function(req, res, next) {
    var msgs     = [],
        category = req.params.category || 'node',
        btype    = '_belong_n',
        itemId  = req.params.itemid,
        CModel = Node;
    
    switch (category) {
        case 'node':
            CModel = Node;
            ctname  = "历程";
            btype    = '_belong_n';
            break;
        case 'suggest':
            CModel = Suggest;
            ctname  = "建议";
            btype    = '_belong_s';
            break;
        case 'experience':
            CModel = Experience;
            ctname  = "心得";
            btype    = '_belong_e';
            break;
        default:
            break;
    }

    if (!req.user) {
        req.session.redirectTo = req.originalUrl;
    }

    var curId  = req.params.id,
        _curId = mongoose.Types.ObjectId(curId);

    var populate = [{
        path: '_belong_u',
        select: '_id nickname avatar bio fans'
    }];

    if (req.user) {
        populate.push({
            path  : '_followers_u',
            match : { _id: req.user.id},
            select: "_id",
            model : Account
        });
    }

    // 查询耗时测试
    var start = new Date().getTime();
    Dream.findOne({
        _id: _curId
    })
    .populate(populate)
    .exec(function(err, dream) {
        var noExistErr  = new Error("找不到该想法..."),
            viewType    = 0,
            currComments = null;

        var currCid;
        if (itemId) {
            noExistErr = new Error("找不到该" + ctname + "...");
            viewType   = 1;

            try {
                itemId =  mongoose.Types.ObjectId(itemId);
            }catch(err) {};
        }

        if (req.query && req.query.cid) {
            noExistErr = new Error("找不到该评论...");
            viewType   = 2;
            currCid = req.query.cid;
        }

        if (err || !dream) {
            return next(noExistErr);
        }

        var isfollow = false;
        if (req.user) {
            isfollow = (dream._followers_u && dream._followers_u.length > 0);
        }

        var match = {
            $match: {
                _belong_d: _curId
            }
        };

        var preMatch = {
            $match: {
                _belong_d: _curId
            }
        };

        if (currCid) {
            return Comment.findById(currCid)
            .exec(function(err, comment) {
                if (err || !comment || !comment[btype]) {
                    return next(noExistErr);
                }

                itemId = comment[btype];
                _resComment();
            });

            function _resComment() {
                var options = {
                    _id: {
                        $gte: currCid
                    }
                };

                options[btype] = itemId

                Comment.count(options, function(err, count) {
                    if (err || !count) {
                        return next(noExistErr);
                    }
    
                    var query = {};
                    query[btype] = itemId;

                    preMatch.$match._id = {
                        $gt: itemId
                    }
        
                    match.$match._id = {
                        $lte: itemId
                    };
    
                    var limit = 10,
                        page  = Math.ceil(count / limit);
    
                    var skip = (page - 1) * 10;
    
                    Comment
                    .find(query)
                    .lean()
                    .populate({
                        path: '_belong_u'
                    })
                    .sort('-date')
                    .skip(skip)
                    .limit(limit)
                    .exec(function(err, comments) {
                        if (err || !comments) {
                            return next(noExistErr);
                        }
                        
                        comments.forEach(function(comment) {
                            comment.isowner = req.user && (comment._belong_u && comment._belong_u._id.equals(req.user.id));
                        });

                        currComments = {
                            currPage: page,
                            comments: comments
                        };
                        _reponse();
                    });
                });
            }
        }
        
        if (itemId) {
            preMatch.$match._id = {
                $gt: itemId
            }

            match.$match._id = {
                $lte: itemId
            };
        }

        _reponse();

        function _reponse() {
            async.parallel([
                function(cb) {
                    if (itemId) {
                        CModel.aggregate([preMatch, {
                            $project: {
                                id        : 1
                            }
                        }, {
                            $sort: { date: -1 }
                        }, {
                            $limit: 1
                        }],
                        function(err, items) {
                            if (err || !items) {
                                return cb(noExistErr, []);
                            };

                            cb(null, items);
                        });
                    } else {
                        cb(null, [])
                    }
                },
                function(cb) {
                    CModel.aggregate([match, {
                        $project: {
                            id        : 1,
                            content   : 1,
                            author    : 1,
                            _belong_u : 1,
                            _belong_d : 1,
                            comments  : { $size: '$comments' },
                            category  : 1,
                            date      : 1
                        }
                    }, {
                        $sort: { date: -1 }
                    }, {
                        $limit: 11
                    }],
                    function(err, items) {
                        if (err || !items) {
                            return cb(noExistErr, []);
                        };

                        cb(null, items);
                    });
                }], function(err, results) {
                    if (err) {
                        return next(err);
                    }

                    if (!results || results.length < 2) {
                        return next(noExistErr);
                    }

                    var pitems = results[0],
                        items  = results[1];

                    var hasprev = false,
                        iprev   = 0;
                    if (pitems[0]) {
                        hasprev = true;
                        iprev = pitems[0]._id;
                    }

                    var hasmore = false,
                        inext   = 0;
                    if (items[10]) {
                        hasmore = true;
                        inext = items[10]._id;
                    }
                    items = items.slice(0, 10);
    
                    Account.populate(items, { path: '_belong_u' }, function(err, ritems) {
                        if (err) {
                            return next(err);
                        }
    
                        if (!ritems) {
                            return next(noExistErr);
                        }
    
                        ritems.forEach(function(item) {
                            item.isowner = req.user && (item._belong_u && item._belong_u._id.equals(req.user.id));
                        });
    
                        async.parallel([
                            function(callback) {
                                Dream.findById(curId)
                                .populate({
                                    path: '_followers_u',
                                    options: { limit: 6 },
                                })
                                .exec(function(err, res) {
                                    var userNum = 0,
                                        dfollowers = [];
                                    if (err || !res) {
                                        return callback(null, [userNum, dfollowers]);
                                    }
                                    
                                    dfollowers = res._followers_u || dfollowers;
    
                                    Dream.aggregate([{
                                        $match: {
                                            _id: res._id
                                        }
                                    }, {
                                        $project: {
                                            _followers_u: {$size: '$_followers_u'}
                                        }
                                    }],
                                    function(err, docs) {
                                        if (err) return callback(null, [userNum, dfollowers]);
                                            
                                        if (docs && docs.length > 0) {
                                            userNum = docs[0]._followers_u;
                                        }
                                        callback(null, [userNum, dfollowers])
                                    });
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
                                .sort('-date')
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
                                    return next(noExistErr);
                                }
    
                                var accounts = results[0][1]? results[0][1]:[],
                                    author   = dream._belong_u;
                        
                                if (req.user) {
                                    var uid = req.user.id;
                                    var _uid = mongoose.Types.ObjectId(uid);
                            
                                    accounts.forEach(function(account) {
                                        account.isfollow = (account.fans.indexOf(_uid)!== -1);
                                    });

                                    if (author)
                                        author.isfollow = (author.fans.indexOf(_uid)!== -1)
                                }
    
                                var resData = {
                                    author     : author,
                                    membercount: results[0][0]? results[0][0]:0,
                                    members    : accounts,
                                    prev       : results[1][0],
                                    nodes      : ritems,
                                    hasprev    : hasprev,
                                    hasmore    : hasmore,
                                    nprev      : iprev,
                                    nnext      : inext,
                                    current    : results[2][0],
                                    next       : results[2][1],
                                    isFollow   : isfollow,
                                    text       : settings.COMMENT_TEXT,
                                    viewType   : viewType,
                                    category   : category,
                                    currNid    : itemId,
                                    currCid    : currCid,
                                    currComments: currComments,
                                    isauthenticated: !!req.user
                                };

                                res.render('pages/dream', makeCommon({
                                    user  : req.user,
                                    title : settings.APP_NAME,
                                    notice: getFlash(req, 'notice'),
                                    data  : resData,
                                    success: 1
                                }, res));
                                var spend = end - start;
                                if (spend > maxtime) {
                                    var end = new Date().getTime();
                                    console.log(req.originalUrl + ' spend' + spend + 'ms');
                                }
                            }
                        );
                    });
                }
            );
        }
    });
});

// 获取想法信息
router.get('/dreams', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var user = req.user,
        uid  = user.id,
        query = { 
            _belong_u: uid 
        };

    var tab = "mdreams";
    if (req.query && req.query.tab) {
        tab = req.query.tab;
        switch(tab) {
            case "mdreams":
                query = {
                    "_belong_u": uid
                }
                break;
            case "fdreams":
                query = {
                    "_id": {
                        "$in": user._following_d
                    }
                }
                break;
            default:
                break;
        }
    }

    var page  = 1,
        limit = 10;

    if (req.query && req.query.page) {
        page = parseInt(req.query.page, 10);
    }

    var skip = (page - 1) * 10;

    async.parallel([
        function(cb) {
            Dream.count(query, function(err, count) {
                if (err || !count) {
                    return cb(null, 0);
                }

                cb(null, count)
            });
        },
        function(cb) {
            Dream
            .find(query)
            .select('_id title  description')
            .lean()
            .sort('-date')
            .skip(skip)
            .limit(limit)
            .exec(function(err, dreams) {
                if (err || !dreams) {
                    return cb(null, []);
                }

                cb(null, dreams)
            });
        }
    ], function(err, results) {
        if (err || !results || results.length !== 2) {
            return next(new Error("异常错误。"))
        }

        var dreams = results[1],
            count  = results[0];

        res.json({
            info    : 'ok',
            data    : {
                count   : count,
                dreams  : dreams,
                tab     : tab,
                page    : page
            },
            result  : 0
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

// 获取动态信息
router.get('/activities', function(req, res, next) {
    var defaultErr = new Error("获取更多动态失败。");

    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var user = req.user,
        uid  = user._id;

    if (!req.query || !req.query.anext) {
        return next(defaultErr);
    }

    var _current = req.query.anext;

    var fields = {
        $or: [{
            "_belong_u": { 
                "$in": user.follows
            }
        }, {
            "_belong_d": {
                "$in": user._following_d
            }
        }, {
            "_belong_u": uid
        }]
    };

    var tab = 'all';
    if (req.query && req.query.tab) {
        tab = req.query.tab;
        switch(tab) {
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

    fields._id =  {
        $lte: _current
    };

    Activity.find(fields)
    .sort('-date')
    .limit(11)
    .populate([{
            path: '_create_d',
            select: '_id title description'
        }, {
            path: '_create_n',
            select: '_id content'
        }, {
            path: '_create_e',
            select: '_id summary images'
        }, {
            path: '_create_s',
            select: '_id summary images'
        }, {
            path: '_belong_u',
            select: '_id nickname avatar'
        }, {
            path: '_belong_d',
            select: '_id title description'
    }])
    .exec(function(err, activities) {
        if (err || !activities) {
            var unKonwErr = new Error('未知错误。')
            return next(err || unKonwErr);
        }

        var hasmore = false,
            anext   = 0;
        if (activities[10]) {
            hasmore = true;
            anext = activities[10]._id;
        }
        activities = activities.slice(0, 10);

        res.json({
            info: "ok",
            result: 0,
            data: {
                activities : activities,
                hasmore    : hasmore,
                anext      : anext,
                tab        : tab
            }
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

// 获取历程信息
router.get('/dream/:id([a-z0-9]+)/:items(nodes|suggests|experiences)', function(req, res, next) {
    var type = req.params.items,
        Model = Node,
        tname = "历程";

    switch(type) {
        case "nodes":
            tname = "历程";
            Model = Node;
            break;
        case "suggests":
            tname = "建议";
            Model = Suggest;
            break;
        case "experiences":
            tname = "心得";
            Model = Experience;
            break;
        default:
            break;
    }

    var curId  = req.params.id,
        defaultErr = new Error("获取更多" + tname + "失败。"),
        _curId = mongoose.Types.ObjectId(curId);

    if (!req.query || !req.query.nnext) {
        return next(defaultErr);
    }

    var _current = mongoose.Types.ObjectId(req.query.nnext);

    Model.aggregate([{
        $match: {
            _belong_d: _curId,
            _id: {
                $lte: _current
            }
        }
    }, {
        $project: {
            id        : 1,
            content   : 1,
            author    : 1,
            _belong_u : 1,
            _belong_d : 1,
            comments  : { $size: '$comments' },
            category  : 1,
            date      : 1
        }
    }, {
        $sort: { date: -1 }
    }, {
        $limit: 11
    }],
    function(err, nodes) {
        if (err || !nodes) {
            return next(defaultErr);
        };

        var hasmore = false,
            nnext   = 0;
        if (nodes[10]) {
            hasmore = true;
            nnext = nodes[10]._id;
        }

        nodes = nodes.slice(0, 10);

        Account.populate(nodes, { 
            path: '_belong_u',
            select: 'nickname _id avatar'
        }, function(err, rnodes) {
            if (err || !rnodes) {
                return next(defaultErr);
            }

            rnodes.forEach(function(node) {
                node.isowner = req.user && (node._belong_u && node._belong_u._id.equals(req.user.id));
            });

            return res.json({
                info: "ok",
                result: 0,
                data: {
                    nodes: rnodes,
                    hasmore: hasmore,
                    nnext: nnext
                }
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

// 获取更晚的历程信息
router.get('/dream/:id([a-z0-9]+)/:pitems(pnodes|psuggests|pexperiences)', function(req, res, next) {
    var type = req.params.pitems,
        Model = Node,
        tname = "历程";

    switch(type) {
        case "pnodes":
            tname = "历程";
            Model = Node;
            break;
        case "psuggests":
            tname = "建议";
            Model = Suggest;
            break;
        case "pexperiences":
            tname = "心得";
            Model = Experience;
            break;
        default:
            break;
    }

    var curId  = req.params.id,
        defaultErr = new Error("获取更多" + tname + "失败。"),
        _curId = mongoose.Types.ObjectId(curId);

    if (!req.query || !req.query.nprev) {
        return next(defaultErr);
    }

    var _current = mongoose.Types.ObjectId(req.query.nprev);

    Model.aggregate([{
        $match: {
            _belong_d: _curId,
            _id: {
                $gte: _current
            }
        }
    }, {
        $project: {
            id        : 1,
            content   : 1,
            author    : 1,
            _belong_u : 1,
            _belong_d : 1,
            comments  : { $size: '$comments' },
            category  : 1,
            date      : 1
        }
    }, {
        $sort: { date: 1 }
    }, {
        $limit: 11
    }],
    function(err, nodes) {
        if (err || !nodes) {
            return next(defaultErr);
        };

        var hasprev = false,
            nprev   = 0;
        if (nodes[10]) {
            hasprev = true;
            nprev = nodes[10]._id;
        }

        nodes = nodes.slice(0, 10);

        Account.populate(nodes, { 
            path: '_belong_u',
            select: 'nickname _id avatar'
        }, function(err, rnodes) {
            if (err || !rnodes) {
                return next(defaultErr);
            }

            rnodes.forEach(function(node) {
                node.isowner = req.user && (node._belong_u && node._belong_u._id.equals(req.user.id));
            });

            return res.json({
                info: "ok",
                result: 0,
                data: {
                    nodes: rnodes,
                    hasprev: hasprev,
                    nprev: nprev
                }
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

// 获取历程/建议/心得评论
router.get('/:category(node|suggest|experience)/:id([a-z0-9]+)/comments', function(req, res, next) {
    var category = req.params.category,
        curId    = req.params.id,
        query    = {};

    switch(category) {
        case 'node':
            query._belong_n = curId;
            break;
        case 'suggest':
            query._belong_s = curId;
            break;
        case 'experience':
            query._belong_e = curId;
            break;
        default:
            break;
    }

    var page  = 1,
        limit = 10;

    if (req.query && req.query.page) {
        page = parseInt(req.query.page, 10);
    }

    var skip = (page - 1) * 10;

    async.parallel([
        function(cb) {
            Comment.count(query, function(err, count) {
                if (err || !count) {
                    return cb(null, 0);
                }

                cb(null, count)
            });
        },
        function(cb) {
            Comment
            .find(query)
            .lean()
            .populate({
                path: '_belong_u'
            })
            .sort('-date')
            .skip(skip)
            .limit(limit)
            .exec(function(err, comments) {
                if (err || !comments) {
                    return cb(null, []);
                }

                cb(null, comments)
            });
        }
    ], function(err, results) {
        if (err || !results || results.length !== 2) {
            return next(new Error("异常错误。"))
        }

        var comments = results[1],
            count    = results[0];

        comments.forEach(function(comment) {
            comment.isowner = req.user && (comment._belong_u && comment._belong_u._id.equals(req.user.id));
        });

        res.json({
            isauthenticated: !!req.user,
            count   : count,
            comments: comments,
            result  : 0
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

// 用户
router.get('/user/:id([a-z0-9]+)', function(req, res, next) {
    var curId = req.params.id;

    var populate = [];

    if (req.user) {
        populate = {
           path  : 'fans',
           match : { _id: req.user.id},
           select: "_id",
           model : Account
        };
    }

    var start = new Date().getTime();
    Account.findOne({_id: curId})
    .lean()
    .select('fans avatar nickname bio date')
    .populate(populate)
    .exec(function(err, account) {
        var unexisterr = new Error(settings.USER_NOT_EXIST_TIPS);
        if (err) {
            return next(unexisterr);
        };

        if (!account) {
            return next(unexisterr);
        }else{
            var page  = 1,
                limit = 10;

            if (req.query && req.query.page) {
                page = parseInt(req.query.page);
            }

            var skip = (page - 1) * 10;

            async.parallel([
                function(cb) {
                    Dream.count({
                        _belong_u: curId
                    }, function(err, count) {
                        if (err || !count) {
                            return cb(null, 0);
                        }
        
                        cb(null, count)
                    });
                },
                function(cb) {
                    Dream
                    .find({
                        _belong_u: curId
                    })
                    .select('_id title description')
                    .lean()
                    .sort('-date')
                    .skip(skip)
                    .limit(limit)
                    .exec(function(err, dreams) {
                        if (err || !dreams) {
                            return cb(null, []);
                        }
        
                        cb(null, dreams)
                    });
                },
                function(cb) {
                    Account.count({
                        fans: curId
                    }, function(err, count) {
                        if (err || !count) {
                            return cb(null, 0);
                        }

                        cb(null, count);
                    });
                },
                function(cb) {
                    Account.count({
                        follows: curId
                    }, function(err, count) {
                        if (err || !count) {
                            if (err || !count) {
                                return cb(null, 0);
                            }
                        }

                        cb(null, count);
                    });
                }
                ], function(err, results) {
                if (err || !results || results.length !== 4) {
                    return next(new Error("异常错误。"))
                }
        
                var dreams = results[1],
                    total  = results[0],
                    following = results[2];
                    followers = results[3];

                var count = Math.ceil(total/limit);

                var isfollow = false,
                    currUser = account.nickname;
                if (req.user) {
                    var uid = req.user._id;
                    if (uid.equals(curId)) currUser = "我"
                    isfollow = (account.fans && account.fans.length > 0);
                }

                var resData = {
                    id       : curId,
                    currUser : currUser,
                    name     : account.nickname,
                    avatar   : account.avatar,
                    bio      : account.bio,
                    isfollow : isfollow,
                    following: following,
                    followers: followers,
                    join_date: account.date.toISOString()
                        .replace(/T/, ' ').replace(/\..+/, '')
                };
    
                var resRender = function(data) {
                    res.render('pages/user', makeCommon({
                        title: settings.APP_NAME,
                        notice: getFlash(req, 'notice'),
                        user : req.user,
                        data: data,
                        success: 1
                    }, res));
    
                    var spend = end - start;
                    if (spend > maxtime) {
                        var end = new Date().getTime();
                        console.log(req.originalUrl + ' spend' + spend + 'ms');
                    }
                }
    
                if (req.query && req.query.tab == "activity") {
                    Activity.find({
                        "_belong_u": account._id
                    })
                    .lean()
                    .sort('-date')
                    .limit(11)
                    .populate([{
                    path: '_create_d',
                    select: '_id title description'
                    }, {
                        path: '_create_n',
                        select: '_id content'
                    }, {
                        path: '_create_s',
                        select: '_id summary images'
                    }, {
                        path: '_create_e',
                        select: '_id summary images'
                    }, {
                        path: '_belong_u',
                        select: '_id nickname avatar'
                    }, {
                        path: '_belong_d',
                        select: '_id title description'
                    }])
                    .exec(function(err, activities) {
                        if (err || !activities) {
                            var unKonwErr = new Error('未知错误。')
                                return next(err || unKonwErr);
                        }

                        var hasmore = false,
                            anext   = 0;
                        if (activities[10]) {
                            hasmore = true;
                            anext = activities[10]._id;
                        }
                        activities = activities.slice(0, 10);
    
                        resData.tab = "activity";
                        resData.anext = anext;
                        resData.hasmore = hasmore;
                        resData.activities = activities;
                        resRender(resData);
                    });
    
                    return;
                }

                var pstart = 2,
                    prand  = 3;

                if (count > prand && page > count - prand) {
                    pstart = count - 3;
                }
                
                if (page > prand && page <= count - prand) {
                    pstart = page - 1;
                }

                pstart = Math.max(2, pstart);

                var pend = pstart + prand;
    
                resData.tab = "dream";
                resData.dreams  = dreams;
                resData.count = count;
                resData.page = page;
                resData.start = pstart;
                resData.end = pend;
                resRender(resData);
            });
        }
    });
});

// 获取用户动态信息
router.get('/user/:id([a-z0-9]+)/activities', function(req, res, next) {
    var defaultErr = new Error("获取更多动态失败。");

    var curId = req.params.id;

    if (!req.query || !req.query.anext) {
        return next(defaultErr);
    }

    var _current = req.query.anext;

    var fields = {
        "_belong_u": curId,
        "_id"      : {
            $lte: _current
        }
    };

    Activity.find(fields)
    .sort('-date')
    .limit(11)
    .populate([{
        path: '_create_d',
        select: '_id title description'
    }, {
        path: '_create_n',
        select: '_id content'
    }, {
        path: '_create_s',
        select: '_id summary images'
    }, {
        path: '_create_e',
        select: '_id summary images'
    }, {
        path: '_belong_u',
        select: '_id nickname avatar'
    }, {
        path: '_belong_d',
        select: '_id title description'
    }])
    .exec(function(err, activities) {
        if (err || !activities) {
            var unKonwErr = new Error('未知错误。')
            return next(err || unKonwErr);
        }

        var hasmore = false,
            anext   = 0;
        if (activities[10]) {
            hasmore = true;
            anext = activities[10]._id;
        }
        activities = activities.slice(0, 10);

        res.json({
            info: "ok",
            result: 0,
            data: {
                id         : curId,
                activities : activities,
                hasmore    : hasmore,
                anext      : anext
            }
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

// 获取消息信息
router.get('/message/view', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid   = req.user.id,
        rdate = req.user.msgreviewdate;

    var fields = {
        '_belong_u': uid
    };
        
    Message.find(fields)
    .sort('-date')
    .limit(5)
    .exec(function(err, msgs) {
        if (err) {
            return next(err);
        }

        if (rdate) {
            req.user.update({
                msgreviewdate : new Date()
            }, function(err, course) {
                if (err) {
                    return next(err);
                }

                res.msgs = msgs;
                res.json({
                    info: "ok",
                    data: msgs,
                    result: 0
                });
            });
        } else {
            req.user.msgreviewdate = new Date();
            req.user.save(function(err) {
                if (err) {
                    return next(err);
                }

                res.msgs = msgs;
                res.json({
                    info: "ok",
                    data: msgs,
                    result: 0
                });
            })
        }
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

// 消息页
router.get('/message', function(req, res) {
    if (!req.user) {
        return res.redirect('/signin');
    }

    var uid   = req.user.id,
        rdate = req.user.msgreviewdate;

    var fields = {
        '_belong_u': uid
    };

    var page  = 1,
        limit = 10;

    if (req.query && req.query.page) {
        page = parseInt(req.query.page);
    }

    var skip = (page - 1) * 10;

    // 查询耗时测试
    var start = new Date().getTime();


    async.parallel([
        function(cb) {
            Message.count(fields, function (err, count) {
                if (err || !count) {
                    return cb(null, 0);
                }
                
                cb(null, count);
            });
        },
        function(cb) {
            Message.find(fields)
            .lean()
            .sort('-date')
            .skip(skip)
            .limit(limit)
            .exec(function(err, msgs) {
                if (err || !msgs) {
                    var unKnowErr = new Error('未知错误。');
                    return cb(err || unKnowErr, []);
                }
                
                cb(null, msgs);
            });
        }], function(err, results) {
            if (err || !results || results.length !== 2) {
                return next(err);
            }
    
            var total = results[0],
                msgs  = results[1];

            var count = Math.ceil(total/limit);

            var pstart = 2,
                prand  = 3;

            if (count > prand && page > count - prand) {
                pstart = count - 3;
            }
                
            if (page > prand && page <= count - prand) {
                pstart = page - 1;
            }

            pstart = Math.max(2, pstart);

            var pend = pstart + prand;

            res.render('pages/message', makeCommon({
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                user : req.user,
                data: {
                    msgs  : msgs,
                    page  : page,
                    count : count,
                    start : pstart,
                    end   : pend
                },
                result: 0
            }, res));

            var spend = end - start;
            if (spend > maxtime) {
                var end = new Date().getTime();
                console.log(req.originalUrl + ' spend' + spend + 'ms');
            }
 
        }
    );
});

// 关注的人
router.get('/user/:id([a-z0-9]+)/following', function(req, res) {
    var curId   = req.params.id;
    
    var isMe    = false;

    var fields = {
        'fans': curId
    };

    var populate = [];

    if (req.user) {
        isMe    = curId === req.user.id;
        populate = {
           path  : 'fans',
           match : { _id: req.user.id},
           select: "_id",
           model : Account
        };
    }

    // 查询耗时测试
    var start = new Date().getTime();

    Account.find(fields)
    .lean()
    .select('_id nickname avatar fans')
    .sort('-date')
    .populate(populate)
    .exec(function(err, following) {
        if (err || !following) {
            var unKnowErr = new Error('未知错误。');
            return next(err || unKnowErr);
        }

        res.render('pages/following', makeCommon({
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            user : req.user,
            data: {
                following: following,
                isme: isMe
            },
            result: 0
        }, res));

        var spend = end - start;
        if (spend > maxtime) {
            var end = new Date().getTime();
            console.log(req.originalUrl + ' spend' + spend + 'ms');
        }

    });
});

// 粉丝页
router.get('/user/:id([a-z0-9]+)/followers', function(req, res) {
    var curId   = req.params.id;

    var isMe    = false;

    var fields = {
        'follows': curId
    };

    var populate = [];

    if (req.user) {
        isMe    = curId === req.user.id;

        populate = {
           path  : 'fans',
           match : { _id: req.user.id},
           select: "_id",
           model : Account
        };
    }

    // 查询耗时测试
    var start = new Date().getTime();

    Account.find(fields)
    .lean()
    .select('_id avatar nickname fans')
    .sort('-date')
    .populate(populate)
    .exec(function(err, followers) {
        if (err || !followers) {
            var unKnowErr = new Error('未知错误。');
            return next(err || unKnowErr);
        }

        res.render('pages/followers', makeCommon({
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            user : req.user,
            data: {
                followers: followers,
                isme: isMe
            },
            result: 0
        }, res));

        var spend = end - start;
        if (spend > maxtime) {
            var end = new Date().getTime();
            console.log(req.originalUrl + ' spend' + spend + 'ms');
        }

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

    req.user.update({
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

router.post('/settings/emails/reverification', function(req, res) {
    if (!req.user) {
        return res.redirect('/signin');
    }

    var email = req.user.username;

    Account.resendVerificationEmail(req.protocol + '://' + settings.DOMAIN, email, function(err) {
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
        res.render('pages/profile', makeCommon({
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            user : req.user,
            success: 1
        }, res));
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

            res.render('pages/account', makeCommon({
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                user : req.user,
                data: {
                    error: getFlash(req, 'error')
                },
                success: 1
            }, res));
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

            res.render('pages/emails', makeCommon({
                title: settings.APP_NAME,
                notice: getFlash(req, 'notice'),
                user : req.user,
                data: {
                    error: getFlash(req, 'error')
                },
                success: 1
            }, res));
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
            //res.redirect('/dream/' + result[0].id);
            renderRecommand(req, res);
        }else{
            res.redirect('/result');
        }
    });
});

// 搜索结果
router.get('/query', function(req, res, next) {
    function reponse(data) {
        res.json({
            info: "success!",
            data: data,
            result: 0
        });
    }

    if (!req.query) {
        return reponse(null);
    }

    var query = req.query.query;

    if (typeof query == "string") {
        query = query.trim();
    }else{
        return reponse(null);
    }
    
    async.parallel([
        function(cb) {
           Dream
            .find({
                title: new RegExp(quote(query), 'i')
            }, 'title')
            .limit(5)
            .exec(function(err, dreams) {
                if (err) {
                    return cb(err, []);
                }

                cb(null, dreams);
            });
        },
        function(cb) {
           Account
            .find({
                nickname: new RegExp(quote(query), 'i')
            }, 'nickname avatar')
            .limit(3)
            .exec(function(err, users) {
                if (err) {
                    return cb(err, []);
                }

                cb(null, users);
            });
        }
    ], function(err, results) {
        if (err || !results || results.length !== 2) {
            err = new Error('服务器异常.');
            return next(err);
        }

        var data = {
            dreams: results[0],
            users: results[1]
        }

        reponse(data);
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

// 搜索结果
router.get('/result', function(req, res, next) {
    if (!req.query) {
        return reponse('content', []);
    }

    function reponse(type, data) {
        res.render('pages/result', makeCommon({
            title: settings.APP_NAME,
            notice: getFlash(req, 'notice'),
            user : req.user,
            data: {
                query: req.query.query,
                type: type,
                results: data
            },
            result: 0
        }, res));
    }

    var query = req.query.query,
        type  = req.query.type || 'content';

    if (typeof query !== "string") {
        return reponse(type, []);
    }

    query = query.trim();

    if (!query) {
        return reponse(type, []);
    }

    switch(type) {
        case 'content':
            Dream
            .find({
                title: new RegExp(quote(query), 'i')
            })
            .lean()
            .select('_id title description')
            .limit(9)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                reponse(type, results);
            });
            break;
        case 'user':
            Account
            .find({
                nickname: new RegExp(quote(query), 'i')
            })
            .lean()
            .select('_id nickname avatar')
            .limit(9)
            .exec(function(err, results) {
                if (err) {
                    return next(err);
                }

                reponse(type, results);
            });
            break;
        default:
            reponse(-1, results);
            break;
    }
});

// 资源仓库
/*router.get('/store', function(req, res) {
    res.render('pages/store', {
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
    res.render('pages/intro', makeCommon({
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user,
        data: {
        },
        success: 1
    }, res));
});

// 联系我们
router.get('/contact', function(req, res) {
    res.render('pages/contact', makeCommon({
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user,
        data: {
        },
        success: 1
    }, res));
});

// 登录页面
router.get('/signin', function(req, res) {
    res.render('pages/signin', makeCommon({
        title : settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        error:  getFlash(req, 'info'),
        user : req.user
    }, res));
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
    Account.register(req.protocol + '://' + settings.DOMAIN, new Account({
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
    res.render('pages/forgot', makeCommon({
        notice: '',
        error:  getFlash(req, 'error'),
        title : settings.APP_NAME,
        user: req.user,
        data: {}
    }, res));
});

// 发送重置邮件
router.post('/forgot', function(req, res, next) {
    Account.forgot(req.protocol + '://' + settings.DOMAIN, req.body.email, function(err, info) {
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

        res.render('pages/reset', makeCommon({
            token : token,
            notice: getFlash(req, 'notice'),
            title : settings.APP_NAME,
            user: req.user
        }, res));
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
    res.render('pages/signup', makeCommon({
        info : getFlash(req, 'signuperror'),
        notice: getFlash(req, 'notice'),
        title : settings.APP_NAME,
        user : req.user
    }, res));
});

// 登出
router.get('/signout', function(req, res) {
    req.logout();
    res.redirect('/');
});

// 建设中
router.get('/building', function(req, res) {
    res.render('pages/building', makeCommon({
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user
    }, res));
});

// 建设中
router.get('/canvas', function(req, res) {
    res.render('pages/canvas', makeCommon({
        title: settings.APP_NAME,
        notice: getFlash(req, 'notice'),
        user : req.user
    }, res));
});

// 点赞
router.post('/dream/good', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    Dream.findById(dreamID, 'supporters', function(err, dream) {
        dream.good(req.user, function(err, num) {
            if (err) {
                return next(err.message);
            }

            return res.json({
                info: 'success!',
                data: {
                    num: num
                },
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

// 反对
router.post('/dream/bad', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    Dream.findById(dreamID, 'supporters', function(err, dream) {
        dream.bad(req.user, function(err, num) {
            if (err) {
                return next(err.message);
            }

            return res.json({
                info: 'success!',
                data: {
                    num: num
                },
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

// 取消点赞
router.post('/dream/cgood', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    Dream.findById(dreamID, 'supporters', function(err, dream) {
        dream.cancelGood(req.user, function(err, num) {
            if (err) {
                return next(err.message);
            }

            return res.json({
                info: 'success!',
                data: {
                    num: num
                },
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

// 取消反对
router.post('/dream/cbad', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    if (!req.body.did) {
        return next(new Error("请求参数错误..."));
    }

    var dreamID = req.body.did;

    Dream.findById(dreamID, 'supporters', function(err, dream) {
        dream.cancelBad(req.user, function(err, num) {
            if (err) {
                return next(err.message);
            }

            return res.json({
                info: 'success!',
                data: {
                    num: num
                },
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

// 创建一个想法
router.post('/dream/new', function(req, res, next) {
    if (!req.user) {
        res.redirect('/signin');
    }

    var uid = req.user.id;
    var nickname = req.user.nickname;

    if (!req.body || !req.body.title) {
        return next(new Error("参数传递错误..."));
    }

    if (!/^[我希望|我想].+/.test(req.body.title.trim())) {
        return next(new Error("标题必须以“我希望”或者“我想”开头"));
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

            res.redirect('/dream/' + dream._id);
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

// 创建心得
router.post('/experience/new', function(req, res, next) {
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

            var experience = new Experience({
                _belong_d: dream._id,
                _belong_u: user._id,
                author   : user.nickname,
                content  : req.body.content
            });

            experience.extract();

            experience.save(function(err) {
                if (err) return next(err);

                dream.experiences.push(experience);
                user.experiences.push(experience);

                var newAc = new Activity({
                    _belong_u : user._id,
                    _belong_d : dream._id,
                    _create_e : experience._id,
                    alias     : user.nickname,
                    type      : experience.category
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

                        res.redirect('/dream/' + dream._id + '/experience');
                });
            });
        }
    );
});

// 保存一个梦想节点
router.post('/suggest/new', function(req, res, next) {
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

            var suggest = new Suggest({
                _belong_d: dream._id,
                _belong_u: user._id,
                author   : user.nickname,
                content  : req.body.content
            });

            suggest.extract();

            suggest.save(function(err) {
                if (err) return next(err);

                dream.suggests.push(suggest);
                user.suggests.push(suggest);

                var newAc = new Activity({
                    _belong_u : user._id,
                    _belong_d : dream._id, 
                    _create_s : suggest._id,
                    alias     : user.nickname,
                    type      : suggest.category
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

                        res.redirect('/dream/' + dream._id + '/suggest');
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
        return next(new Error("标题不能不填..."));
    }

    if (typeof des === "string") {
        if (des.length <= 140) {
            fields.description = des;
        }else{
            return next(new Error("想法的介绍超过内容最大限制..."));
        }
    }

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

    var bl   = parseInt(req.body.bl, 10);
    var did  = req.body.did;
    var blID = req.body.blid;

    var content = req.body.content;

    if (typeof content !== "string" || !content.trim()) {
        return next(new Error("您的" + settings.COMMENT_TEXT.EXPANSION_COMMENT + "是空内容，创建失败..."));
    }

    // 查询耗时测试
    var start = new Date().getTime(), Model;

    switch(bl) {
        case settings.OBJEXT_TYPE.NODE:
            category = "node";
            Model = Node;
            break;
        case settings.OBJEXT_TYPE.SUGGEST:
            category = "suggest";
            Model = Suggest;
            break;
        case settings.OBJEXT_TYPE.EXPERIENCE:
            category = "experience";
            Model = Experience;
            break;
        default:
            return next(new Error("请求参数错误，创建失败..."));
            break;
    }

    Model.findOne({_id: blID})
        .select('comments _belong_u')
        .populate({
            path: '_belong_u',
            select: 'messages'
        })
        .exec(function(err, object) {
        if (!object) {
            var err = new Error("发布" + settings.COMMENT_TEXT.EXPANSION_COMMENT + "失败...");
            return next(err);
        }

        var fields = {
            _belong_d: did,
            _belong_u: uid,
            author   : nickname,
            content  : content.trim(),
            category : bl
        }

        switch(bl) {
            case settings.OBJEXT_TYPE.NODE:
                fields._belong_n = blID;
                break;
            case settings.OBJEXT_TYPE.SUGGEST:
                fields._belong_s = blID;
                break;
            case settings.OBJEXT_TYPE.EXPERIENCE:
                fields._belong_e = blID;
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
                var url        = '/dream/' + comment._belong_d + '/' + category + '/' + blID + '?cid=' + comment.id,
                    other = object._belong_u;

                var msgfields  = {
                    _belong_u: other._id,
                    url      : url,
                    title    : '你有新的评论',
                    content  : comment.content
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
                    getItemComments(blID, bl, 1, req.user, function(err, data) {
                        if (err) return next(err);

                        data.info   =  "发布成功";
                        data.result = 0;
                        res.json(data);

                        var spend = end - start;
                        if (spend > maxtime) {
                            var end = new Date().getTime();
                            console.log(req.originalUrl + ' spend' + spend + 'ms');
                        }
                    });
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

// 创建回复
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

    var bl    = parseInt(req.body.bl, 10)
    , did     = req.body.did
    , blID    = req.body.blid
    , toid    = req.body.toid
    , forid   = req.body.forid
    , content = req.body.content;

    if (typeof content !== "string" || !content.trim()) {
        return next(new Error("您的回复是空内容，创建失败..."));
    }

    var promise = null,
        category = "node";

    switch(bl) {
        case settings.OBJEXT_TYPE.NODE:
            category = "node";
            promise = Node.findOne({_id: blID}).select('comments').exec();
            break;
        case settings.OBJEXT_TYPE.SUGGEST:
            category = "suggest";
            promise = Suggest.findOne({_id: blID}).select('comments').exec();
            break;
        case settings.OBJEXT_TYPE.EXPERIENCE:
            category = "experience";
            promise = Experience.findOne({_id: blID}).select('comments').exec();
            break;
        default:
            return next(new Error("请求参数错误，创建失败..."));
            break;
    }

    // 查询耗时测试
    var start = new Date().getTime();

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
            category : bl
        }

        switch(bl) {
            case settings.OBJEXT_TYPE.NODE:
                fields._belong_n = blID;
                break;
            case settings.OBJEXT_TYPE.SUGGEST:
                fields._belong_s = blID;
                break;
            case settings.OBJEXT_TYPE.EXPERIENCE:
                fields._belong_e = blID;
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
                var url        = '/dream/' + comment._belong_d + '/' + category + '/' + blID + '?cid=' + comment.id;

                var msgfields  = {
                    _belong_u: toid,
                    url      : url,
                    title    : '你有新的回复',
                    content  : comment.content
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

                    getItemComments(blID, bl, 1, req.user, function(err, data) {
                        if (err) return next(err);

                        data.info   =  "回复成功";
                        data.result = 0;
                        res.json(data);

                        var spend = end - start;
                        if (spend > maxtime) {
                            var end = new Date().getTime();
                            console.log(req.originalUrl + ' spend' + spend + 'ms');
                        }
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

    if (!req.body || !req.body.itemid) {
        return next(new Error("请求参数错误..."));
    }

    var nodeID = req.body.itemid;

    Node.findById(nodeID, function(err, node) {
        if (err) return next(err);

        if (!node) {
            var err = new Error("删除历程失败...");
            return next(err);
        }

        if (!node._belong_u.equals(uid)) {
            var err = new Error("这不是你的历程，你不能删除...");
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

// 删除心得
router.post('/experience/delete', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body || !req.body.itemid) {
        return next(new Error("请求参数错误..."));
    }

    var experienceID = req.body.itemid;

    Experience.findById(experienceID, function(err, experience) {
        if (err) return next(err);

        if (!experience) {
            var err = new Error("删除历程失败...");
            return next(err);
        }

        if (!experience._belong_u.equals(uid)) {
            var err = new Error("这不是你的历程，你不能删除...");
            return next(err);
        }
        
        experience.remove(function(err) {
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

// 删除建议
router.post('/suggest/delete', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body || !req.body.itemid) {
        return next(new Error("请求参数错误..."));
    }

    var suggestID = req.body.itemid;

    Suggest.findById(suggestID, function(err, suggest) {
        if (err) return next(err);

        if (!suggest) {
            var err = new Error("删除历程失败...");
            return next(err);
        }

        if (!suggest._belong_u.equals(uid)) {
            var err = new Error("这不是你的历程，你不能删除...");
            return next(err);
        }
        
        suggest.remove(function(err) {
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

    if (!req.body || !req.body.cid) {
        return next(new Error("请求参数错误..."));
    }

    var commentID = req.body.cid;

    // 查询耗时测试
    var start = new Date().getTime();

    var cname = settings.COMMENT_TEXT.EXPANSION_COMMENT;

    Comment.findById(commentID, '_belong_u category', function(err, comment) {
        if (err) return next(err);

        if (!comment) {
            var err = new Error("删除" + cname + "失败...");
            return next(err);
        }

        if (!comment._belong_u.equals(uid)) {
            var err = new Error("这不是你的" + cname + "，你不能删除...");
            return next(err);
        }

        comment.remove(function(err) {
            if (err) {
                var err = new Error("删除" + cname + "失败...");
                return next(err);
            }

            res.json({
                info: "删除" + cname + "成功",
                result: 0
            });

            var spend = end - start;
            if (spend > maxtime) {
                var end = new Date().getTime();
                console.log(req.originalUrl + ' spend' + spend + 'ms');
            }
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

// 移除消息
router.post('/message/remove', function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    if (!req.body || !req.body.mid) {
        return next(new Error("请求参数错误..."));
    }

    var msgId = req.body.mid;

    Message.findById(msgId, function(err, msg) {
        if (err) return next(err);

        if (!msg) {
            var err = new Error("移除消息失败...");
            return next(err);
        }

        if (!msg._belong_u.equals(uid)) {
            var err = new Error("这不是你的消息，你不能移除...");
            return next(err);
        }

        msg.remove(function(err) {
            if (err) {
                var err = new Error("移除消息失败...");
                return next(err);
            }

            res.json({
                info: "移除消息成功",
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

// File input field name is simply 'file'
router.post('/avatar/upload', upload.single('avatar'), function(req, res, next) {
    if (!req.user) {
        return res.json({
            info: "请登录",
            result: 2
        });
    }

    var uid = req.user.id;

    var file = __dirname + '/public/avatar/' + req.file.filename;
    fs.rename(req.file.path, file, function(err) {
        if (err) {
            fs.unlink(req.file.path, function(err) {
                if (err) {
                    return next(err);
                }else{
                    return next(new Error("保存图片失败."));
                };
            });
        } else {
            req.user.update({
                avatar : '/avatar/' + req.file.filename
            }, function(err, course) {
                if (err) {
                    return next(err);
                }

                res.json({
                    info: 'img save successfully',
                    dataUrl: '/avatar/' + req.file.filename,
                    result: 1
                });
            });
        }
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
