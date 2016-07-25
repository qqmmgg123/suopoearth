requirejs.config({
    paths   : {
        'jquery': 'jquery.min',
        'common': 'common'
    }
});

define([
   'jquery',
   'common'
], function ($, common) {
    $(function() {
        common.bindCreatCtrl($('#first_cdream_btn'));

        $('.dream-right-inner').find('.tab-nav').on('click', 'a', function() {
            $('.tab-nav').find('a').removeClass('cur');
            $(this).addClass('cur');
            var i = $('.dream-right-inner').find('.tab-nav').find('a').index(this);
            $('.tab-content').find('.tab-item').hide().eq(i).show();
        });
    });
});
