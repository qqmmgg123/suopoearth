requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone': 'backbone-min',
        'utilities': 'utilities',
        'validation': 'validate',
        'face': 'face',
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
