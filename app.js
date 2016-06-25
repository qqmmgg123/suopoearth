var path = require('path')
  , flash = require('connect-flash')
  , settings = require("./settings")()
  , express = require('express')
  , cookieParser = require('cookie-parser')
  , session = require('cookie-session')
  , bodyParser = require('body-parser')
  , connect = require('connect')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , log = require('util').log
  , Message = require("./models/Message");

// browser refresh
var reload = require('reload')
  , http = require('http');

var app = express();

app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

// 定义ejs函数
app.locals = {
    timeFormat : function(date) {
        return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }
};

app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 3000)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({keys: ['secretkey1', 'secretkey2', '...']}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// passport config
var Account = require('./models/account.js');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());

passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect('mongodb://localhost/suopoearth');

// Register routes
app.use('/', require('./routes'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error(settings.PAGE_NOT_FOND_TIPS);
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        if (req.user) {
            var uid   = req.user.id;

            Message.find({
                '_belong_u': uid
            }).exec(function(err_2, msgs) {
                if (err_2) {
                    msgs = [];
                }

                res.status(err.status || 500);
                res.render('error', {
                    notice: '',
                    title: settings.APP_NAME,
                    user : req.user,
                    message: err.message,
                    error: err,
                    data: {
                        message: msgs
                    }
                });

            });
        }else{
            res.status(err.status || 500);
            res.render('error', {
                notice: '',
                title: settings.APP_NAME,
                user : req.user,
                message: err.message,
                error: err,
                data: {
                    message: []
                }
            });
        }
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    if (req.user) {
        var uid   = req.user.id;

        Message.find({
            '_belong_u': uid
        }).exec(function(err_2, msgs) {
            if (err_2) {
                msgs = [];
            }

            res.status(err.status || 500);
            res.render('error', {
                notice: '',
                title: settings.APP_NAME,
                user : req.user,
                message: err.message,
                error: err,
                data: {
                    message: msgs
                }
            });

        });
    }else{
        res.status(err.status || 500);
        res.render('error', {
            notice: '',
            title: settings.APP_NAME,
            user : req.user,
            message: err.message,
            error: err,
            data: {
                message: []
            }
        });
    }
});

var server = http.createServer(app);

reload(server, app)

//app.listen(3000);

server.listen(app.get('port'), function(){
    log('express server running on ' + 3000);
});
