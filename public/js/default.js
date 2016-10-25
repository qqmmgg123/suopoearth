requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone': 'backbone-min',
        'validation': 'validate',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
    common.statistics();
});
