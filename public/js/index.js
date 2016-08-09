requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'text'  : 'text',
        'backbone' : 'backbone-min',
        'template' : '../template',
        'common': 'common'
    }
});

define([
   'underscore',
   'jquery',
   'backbone',
   'common',
   'text!template/aclist.html'
], function (_, $, backbone, common, acTpl) {
    $(function() {
        common.bindCreatCtrl($('#first_cdream_btn'));

        // 想法列表
        var $tabNav = $('.dream-right-inner').find('.tab-nav'),
            $tabContent = $('.dream-right-inner').find('.tab-content');

        $tabNav.on('click', 'a', function() {
            $tabNav.find('a').removeClass('cur');
            $(this).addClass('cur');
            var i = $tabNav.find('a').index(this);
            $tabContent.find('.tab-item').hide().eq(i).show();
        });

        // 动态列表
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
                        common.xhrReponseManage(data, function(data) {
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

        var mdreamList = {
            el: '#dream-list',
            pageArea :  null,
            init: function() {
                this.$el = $(this.el);
                this.pageArea = new common.Page({
                    currPage: 1,
                    total: this.$el.data('total'),
                    list: this,
                    limit: 10
                });
                
                this.$el.after(this.pageArea.$el);
            },
            loadList: function(page, cb) {
                var self = this;
                this.$el.html('<li>想法列表加载中...</li>');
                $.ajax({
                    url: "/dreams",
                    data: {
                        tab   : 'mdreams',
                        page  : page
                    },
                    method: "GET",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function(data) {
                            if (data && data.data && data.data.dreams && data.data.dreams.length) {
                                var dreamsTpl = [
                                    '<% data.dreams.forEach(function(dream) { %>',
                                    '<li>',
                                    '<h3><a href="/dream/<%- dream._id %>"><%- dream.title %></a></h3>',
                                    '<p><%- dream.description %></p>',
                                    '</li>',
                                    '<% }); %>'].join('');

                                var template = _.template(dreamsTpl);
                                self.$el.html(template(data));

                                var data = data.data;
                                self.pageArea.updateOpts({
                                    currPage: data.page,
                                    total: data.count
                                });
                                cb();
                            }
                        });
                    },
                    error: function() {
                        self.$el.html('<li>想法列表加载失败...</li>');
                    }
                });
            }
        };

        mdreamList.init();

        var fdreamList = {
            el: '#fdream-list',
            pageArea :  null,
            init: function() {
                this.$el = $(this.el);
                this.pageArea = new common.Page({
                    currPage: 1,
                    total: this.$el.data('total'),
                    list: this,
                    limit: 10
                });
                
                this.$el.after(this.pageArea.$el);
            },
            loadList: function(page, cb) {
                var self = this;
                this.$el.html('<li>想法列表加载中...</li>');
                $.ajax({
                    url: "/dreams",
                    data: {
                        tab   : 'fdreams',
                        page  : page
                    },
                    method: "GET",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function(data) {
                            if (data && data.data && data.data.dreams && data.data.dreams.length) {
                                var dreamsTpl = [
                                    '<% data.dreams.forEach(function(dream) { %>',
                                    '<li>',
                                    '<h3><a href="/dream/<%- dream._id %>"><%- dream.title %></a></h3>',
                                    '<p><%- dream.description %></p>',
                                    '</li>',
                                    '<% }); %>'].join('');

                                var template = _.template(dreamsTpl);
                                self.$el.html(template(data));

                                var data = data.data;
                                self.pageArea.updateOpts({
                                    currPage: data.page,
                                    total: data.count
                                });
                                cb();
                            }
                        });
                    },
                    error: function() {
                        self.$el.html('<li>想法列表加载失败...</li>');
                    }
                });
            }
        };

        mdreamList.init();

    });
});
