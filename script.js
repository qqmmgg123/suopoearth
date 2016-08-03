var async = require("async")
  , mongoose = require('mongoose')
  , Node = require("./models/node")
  , Comment = require("./models/comment")
  , Dream = require("./models/dream")
  , Account = require("./models/account")
  , Activity = require("./models/activity")
  , Tag = require("./models/tag");

mongoose.connect('mongodb://localhost/suopoearth');

var command = process.argv[2];

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
}
