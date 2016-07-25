requirejs.config({
    paths   : {
        'jquery': 'jquery.min',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
    $(function() {
        // 绑定用户操作
        common.bindUserCtrl();
    });
});
