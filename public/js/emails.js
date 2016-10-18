requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone': 'backbone-min',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
    // 密码重置form校验
    $('#email-btn').on('click', function() {
        var $form = $('#email-form');
        $form.replaceWith("<p>正在发送帐号邮箱认证邮件...请稍等</p>");
        return true;
    });

    common.statistics();
});
