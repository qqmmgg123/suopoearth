var mongoose = require('mongoose')
  , Node = require("./models/node")
  , Comment = require("./models/comment")
  , Dream = require("./models/dream")
  , Account = require("./models/account")
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
    var tag = new Tag({
        key: 'test',
        createdAt: new Date()
    });

    tag.save(function(err) {
        if (err) {
            console.log(err);
        }
    });
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
