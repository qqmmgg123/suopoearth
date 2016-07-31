requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'common': 'common',
        'text'  : 'text',
        'template' : '../template'
    }
});

define([
   'underscore',
   'jquery',
   'common',
   'text!template/aclist.html'
], function (_, $, common, acTpl) {
    $(function() {
        common.bindCreatCtrl($('#first_cdream_btn'));

        $('.dream-right-inner').find('.tab-nav').on('click', 'a', function() {
            $('.tab-nav').find('a').removeClass('cur');
            $(this).addClass('cur');
            var i = $('.dream-right-inner').find('.tab-nav').find('a').index(this);
            $('.tab-content').find('.tab-item').hide().eq(i).show();
        });

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
                    tab   = $this.data('tab');

                $.ajax({
                    url: "/activities",
                    data: {
                        anext : anext,
                        tab   : tab
                    },
                    method: "GET",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function() {
                            if (data) {
                                data = _.extend(data, { 
                                    timeFormat: function(date) {
                                        var date = (new Date(date));
                                        return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
                                    }
                                });

                                var template = _.template(acTpl);
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
    });
});
