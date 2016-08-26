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
        // 绑定用户操作
        common.bindUserCtrl();
        
        // 绑定第一次添加想法操作
        common.bindCreatCtrl($('#first_cdream_btn'));

        if ($('#ac-list').length > 0) {
            var aclist = {
                el: '#ac-list',
                init: function() {
                    this.$el = $(this.el);
                    this.bindEvent();
                },
                bindEvent: function() {
                    var selectors = ['.more'],
                    handles   = [
                        this.loadMoreActivities
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
                loadMoreActivities: function() {
                    // 加载更多历程
                    var $this = $(this),
                        anext = $this.data('anext'),
                        uid   = $this.data('uid');

                    $.ajax({
                        url: "/user/" + uid + "/activities",
                        data: {
                            anext : anext
                        },
                        method: "GET",
                        dataType: "json",
                        success: function(data) {
                            common.xhrReponseManage(data, function() {
                                if (data) {
                                    data = _.extend(data, { 
                                        timeFormat: function(date) {
                                            var date = new Date(date);
                                            return common.dateBeautify(date);
                                        }
                                    });

                                    var template = _.template(uacTpl);
                                    $('#ac-list').append(template(data));
                                    $this.closest('li').remove();
                                }
                            });
                        },
                        error: function() {

                        }
                    });
                }
            };

            aclist.init();
        }
    });
});
