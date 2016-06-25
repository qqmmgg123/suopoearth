var nodemailer = require('nodemailer');

var transportOptions = {
    host: 'smtp.gmail.com',
    port: 465,
    service: 'Gmail',
    auth: {
        user: 'qqmmgg123@gmail.com',
        pass: 'Suopoearth123'
    },
    proxy: 'http://dev-proxy.oa.com:8080/'
};

var verifyMailOptions = {
    from: 'Do Not Reply <qqmmgg123@gmail.com>',
    subject: 'Confirm your account',
    html: 'hello',
    text: 'hello'
};

var transporter = nodemailer.createTransport(transportOptions);

var mailOptions = JSON.parse(JSON.stringify(verifyMailOptions));

mailOptions.to = "hakehaha123@sina.cn";
mailOptions.html = "hello";
mailOptions.text = "hello";

transporter.sendMail(mailOptions, function(error, info){
    if(error){
        return console.log(error);
    }
    console.log('Message sent: ' + info.response);
});
