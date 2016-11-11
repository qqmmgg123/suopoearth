var async = require("async")
  , mongoose = require('mongoose')
  , Node = require("./models/node")
  , Comment = require("./models/comment")
  , Dream = require("./models/dream")
  , Account = require("./models/account")
  , Activity = require("./models/activity")
  , Tag = require("./models/tag")
  , Suggest = require("./models/suggest");

mongoose.connect('mongodb://localhost/suopoearth');

var command = process.argv[2], args = process.argv[3];

function clearnode() {
    Node.find({})
        .populate([{
            path: '_belong_u'
        }, {
            path: '_belong_d'
        }])
        .exec(function(err, node) {
            if (err) {
                console.log(err.message);
                return;
            }

            node.forEach(function(item) {
                if (!item._belong_u  || !item._belong_d) {
                    item.remove();

                    item.save(function(err) {
                        if (err) {
                            console.log(err.message);
                        }
                    });
                }
            });
        });
}

function clearcomment() {
    Comment.find({})
        .populate([{
            path: '_belong_u'
        }, {
            path: '_belong_d'
        }])
        .exec(function(err, comment) {
            if (err) {
                console.log(err.message);
                return;
            }

            comment.forEach(function(item) {
                if (!item._belong_u || !item._belong_d) {
                    item.remove();

                    item.save(function(err) {
                        if (err) {
                            console.log(err.message);
                        }
                    });
                }
            });
        });
}

function test() {
    var start = new Date().getTime();
    var n = 0;
   for (var i=0;i<2000;i++) {
         var uid = '5762028b5847bae44a78cc5c';
         var nickname = 'qqmmgg123';

    var des = "test";
    
    Account.findOne({_id: uid}, function(err, user) {
        if (err) return next(err);

        if (!user) {
            return next(new Error("发布想法失败..."));
        }

        var fields = {
            _belong_u: uid,
            author   : nickname,
            title: 'Test...' + n,
            description: des? des:""
        };

        fields.sharestate = 1;

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
            if (err) {
                console.log(err.message);
            }
            n++;
            if (n == 2000) {
                var end = new Date().getTime();
                console.log(end - start);
            }
        });
    });

    }

    //console.log('complate');
         //var uid = '5762028b5847bae44a78cc5c';
         //uid = mongoose.Types.ObjectId(uid);
/*Account.findById(uid)
    .populate([{
            path: 'dreams',
            select: 'title description',
            options: {
                sort: '-date'
            }
        }])
    .exec(function(err, user) {
        var end = new Date().getTime();
        console.log(user.dreams.length, end - start);
    });*/

/*async.parallel([
            function(cb) {

Dream.find({
    _belong_u: uid,
},
'id',
{
                sort: '-date'
            }, 
    function(err, user) {
        //var end = new Date().getTime();
        //console.log(user.length, end - start);
        cb();
    }).lean();
}, function(cb) {
    Account.findById(uid).lean().exec(function(err, user) {
        cb();
    });
}], function() {
    
        var end = new Date().getTime();
        console.log(end - start);
});*/


/*Dream.find({}, function(err, count) {
                var end = new Date().getTime();
                    console.log(end - start);
                });*/
}

function deleteDream(dreamID) {
    Dream.findById(dreamID, function(err, dream) {
        if (err) return next(err);

        if (!dream) {
            console.log('Dream not found.');
            return;
        }
        
        dream.remove(function(err) {
            if (err) {
                console.log(err.message);
                return;
            }

            console.log('Remove ' + dreamID + 'success!');
        });
    });
}

function cnode(i) {
    console.log('insert...' + i);
    async.parallel([
        function(cb){
            Dream.findOne({_id: '576d45be041d900c14bf8e0e'}, function(err, dream) {
                if (err) return cb(err, null);

                if (!dream) {
                    var err = new Error("添加历程失败...");
                    return cb(err, null);
                }
                
                cb(null, dream);
            });
        },
        function(cb){
            Account.findOne({_id: '5757ca102dd1fff80849ecb2'}, function(err, user) {
                if (err) return cb(err, null);

                if (!user) {
                    var err = new Error("添加历程失败...");
                    return cb(err, null);
                }
                
                cb(null, user);
            });
        }],
        function(err, results){
            var dream = results[0];
            var user = results[1];

            var node = new Node({
                _belong_d: dream._id,
                _belong_u: user._id,
                author   : user.nickname,
                content  : "我在测试你知道吗哈哈哈，我在测试你知道吗哈哈哈我在测试你知道吗哈哈哈，我在测试你知道吗哈哈哈我在测试你知道吗哈哈哈我在测试你知道吗哈哈哈，我在测试你知道吗哈哈哈我在测试你知道吗哈哈哈，我在测试你知道吗哈哈哈。"
            });

            node.save(function(err) {
                dream.nodes.push(node);
                user.nodes.push(node);

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
                        }
                    ], function(err, results) {
                        console.log('ok..' + i);
                });
            });
        }
    );
}

function test2() {
    /*for (var i = 0; i < 1000; i++) {
        cnode(i);
    }*/

    /*Suggest.findById('581c5e4c43255d94983a2da8', function(err, dream) {
        (function(str) {
            var m,
                i = 0,
                urls = [], 
                rex =  /<img.*?src="([^">]*\/([^">]*?))".*?>/g;

            while ( (m = rex.exec( str )) !== null && i < 9 ) {
                urls.push( m[1] );
                i++;
            }

            return urls.join('|');
        })(dream.content);
    });*/
    var start = new Date().getTime();

    /*Node.count({'_belong_d': '576d45be041d900c14bf8e0e'}, function(err, c) {
        var end = new Date().getTime();
        console.log(c, end - start);
    });*/

    /*Dream.aggregate([{$match: {_id: mongoose.Types.ObjectId('576d45be041d900c14bf8e0e')}}, {$project: {nodes: {$size: '$nodes'}}}], function(err, c) {
        var end = new Date().getTime();
        console.log(end - start);
    });*/

    /*Dream.findById('576d45be041d900c14bf8e0e', 'nodes').lean().populate('nodes', 'content').exec(function(err, c) {
        console.log(new Date().getTime() - start);
    });*/

    Node.find({'_belong': '576d45be041d900c14bf8e0e'}, 'content').lean().exec(function(err, c) {
        console.log(new Date().getTime() - start);
    });

    /*Account.find({}, 'nickname').lean().skip(2).limit(3).exec(function(err, users) {
        console.log(users);
    });*/
    //mongoose.connection.once("open",function(err, conn) {
        // body of program in here
        /*var bulk = Tag.collection.initializeUnorderedBulkOp();
        // representing a long loop
        for ( var x = 0; x < 25; x++ ) {
            var tag = {
                // update conditions 
                key: "兴趣_" + x
            };

            bulk.find(tag).upsert().updateOne({$set: { 'key': "兴趣_" + x }, $addToSet: { 'dreams': { $each: [10, 8, 9] } }});
        }

        bulk.execute(function(err, result) {
            if (err) return console.log(err);
        });*/
        //Tag.update({ _id: '58243aaed5d9b8cb3d71d4e5'}, {$addToSet: {'dreams': { $each: [14, 23, 12, 91, 90] }}}).exec(function(err, res) {
            //console.log(err, res);
        //});
    //});
}

switch(command) {
    case '--clearnode':
        clearnode();
        break;
    case '--clearcomment':
        clearcomment();
        break;
    case '--test':
        test();
        break;
    case '--test2':
        test2();
        break;
    case '--deletedream':
        deleteDream(args);
        break;
}
