requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone' : 'backbone-min',
        'utilities': 'utilities',
        'validation': 'validate',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
   'validation'
], function ($, common, Validation) {
    var validation = new Validation({
        form: '#signup-form'
    });

    validation.init();

    common.statistics();
});
