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
    common.bindSignupCtrl($('#share_dream_btn'));
    common.statistics();
});
