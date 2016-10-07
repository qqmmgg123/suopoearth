var path = require('path')
  , flash = require('connect-flash')
  , settings = require("./public/const/settings")
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
  , Message = require("./models/message");

var common = {
    dateBeautify: function(date) {
        var hour      = 60 * 60 * 1000,
            day       = 24 * hour,
            currDate  = this.dateFormat(new Date, 'yyyy-MM-dd'),
            today     = new Date(currDate + ' 00:00:00').getTime(),
            yesterday = today - day,
            currTime  = date.getTime(),
            cHStr     = this.dateFormat(date, 'hh:mm:ss');

        if (currTime >= today) {
            var time    = (currTime - today) / hour;
            var cHour   = date.getHours();
            var amCHour = cHour - 12;
            var cMStr   = this.dateFormat(date, 'mm:ss');
            var str     = time <= 12? '上午 ' + cstr:'下午 ' + (amCHour < 10? amCHour: '0' + amCHour) + ':' + cMStr;
            return str;
        }else if (currTime < today && currTime >= yesterday) {
            return "昨天 " + cHStr;
        }else {
            return this.dateFormat(date, 'yyyy-MM-dd hh:mm:ss');
        }
    },
    dateFormat: function(date, format){
        var o = {
            "M+" : date.getMonth()+1, //month
            "d+" : date.getDate(),    //day
            "h+" : date.getHours(),   //hour
            "m+" : date.getMinutes(), //minute
            "s+" : date.getSeconds(), //second
            "q+" : Math.floor((date.getMonth()+3)/3),  //quarter
            "S" : date.getMilliseconds() //millisecond
        }

        if(/(y+)/.test(format)) format=format.replace(RegExp.$1,
                (date.getFullYear()+"").substr(4 - RegExp.$1.length));
        for(var k in o) if(new RegExp("("+ k +")").test(format))
            format = format.replace(RegExp.$1,
                    RegExp.$1.length==1 ? o[k] :
                    ("00"+ o[k]).substr((""+ o[k]).length));

        return format;
    }
};

// browser refresh
var reload = require('reload')
  , http = require('http');

var app = express();

app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

// 设置js返回时间格式
app.set('json replacer', function (key, value) {
  if (this[key] instanceof Date) {
    // Your own custom date serialization
    value = this[key].getTime();
  }

  return value;
});

// 定义ejs函数
app.locals = {
    timeFormat : function(date) {
        return common.dateBeautify(date);
    }
};

app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 8080)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser('suopoearth'));
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

app.use(function(req, res, next) {
    res.msgs = 0;
    if (!req.user) {
        return next();
    }
    var uid   = req.user._id,
        rdate = req.user.msgreviewdate;

    var fields = {
        '_belong_u': uid
    };

    if (rdate) {
        fields.date = { 
            $gt: rdate
        }
    }

    Message.count(fields, function (err, count) {
        if (err) {
            return next();
        }
        res.msgs = count;
        next();
    });
});

// Register routes
app.use('/', require('./routes'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error(settings.PAGE_NOT_FOND_TIPS);
    err.status = 404;
    next(err);
});

function makeCommon(data, res) {
    if (!data.data) {
        data.data = {};
    }
    data.data.messages = res.msgs;
    return data;
}
// error handlers

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('pages/error', makeCommon({
        notice: '',
        title: settings.APP_NAME,
        user : req.user,
        message: err.message,
        error: err,
        data: {
        }
    }, res));
});

var server = http.createServer(app);

reload(server, app)

//app.listen(3000);

server.listen(app.get('port'), function(){
    log('express server running on ' + 8080);
});
