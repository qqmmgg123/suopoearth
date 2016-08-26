requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone' : 'backbone-min',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
    var msgList = {
        el: '#msg-list',
        init: function() {
            this.$el = $(this.el);
            this.bindEvent();
        },
        bindEvent: function() {
            this.$el.on('click', 'a[rel="message-remove"]', function() {
                var $this = $(this),
                    mid = $this.data('mid'),
                    $msgCurr = $this.closest('li');

                $.ajax({
                    url: "/message/remove",
                    data: {
                        mid: mid
                    },
                    method: "POST",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function() {
                            $msgCurr.fadeOut(function() {
                                $(this).remove();
                            });
                        });
                    },
                    error: function() {

                    }
                });
            });
        }
    };

    msgList.init();
});
