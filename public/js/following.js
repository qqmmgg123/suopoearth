requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone' : 'backbone-min',
        'common': 'common',
        'text'  : 'text',
        'template' : '../template'
    }
});

define([
   'underscore',
   'jquery',
   'common',
   'text!template/uaclist.html'
], function (_, $, common, uacTpl) {
    $(function() {
        if ($('#following-list').length > 0) {
            var followingList = {
                el: '#following-list',
                init: function() {
                    this.$el = $(this.el);
                    this.bindEvent();
                },
                bindEvent: function() {
                    var selectors = ['.follow'],
                    handles   = [
                        common.followManager
                    ];

                    this.$el.on('click', selectors.join(','), function() {
                        var $this = $(this);

                        for (var i = 0, l = selectors.length; i < l; i++) {
                            var selector = selectors[i],
                                handle   = handles[i];

                            if ($this.is(selector)) {
                                handle.call(this);
                            }
                        }
                    });
                },
                
                loadMore: function() {
                }
            };

            followingList.init();
        }
    });
});
