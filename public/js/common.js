define(['jquery', 'jplaceholder', 'backbone'], function ($, jplaceholder, Backbone) {

    var _d = document;

var common = {
    isScroll: true,
    getPageSize: function(){
        var xScroll, yScroll;

        if (window.innerHeight && window.scrollMaxY) { 
            xScroll = document.body.scrollWidth;
            yScroll = window.innerHeight + window.scrollMaxY;
        } else if (document.body.scrollHeight > document.body.offsetHeight){ // all but Explorer Mac
            xScroll = document.body.scrollWidth;
            yScroll = document.body.scrollHeight;
        } else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
            xScroll = document.body.offsetWidth;
            yScroll = document.body.offsetHeight;
        }
 
        var windowWidth, windowHeight;
        if (self.innerHeight) { // all except Explorer
            windowWidth = self.innerWidth;
            windowHeight = self.innerHeight;
        } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
            windowWidth = document.documentElement.clientWidth;
            windowHeight = document.documentElement.clientHeight;
        } else if (document.body) { // other Explorers
            windowWidth = document.body.clientWidth;
            windowHeight = document.body.clientHeight;
        } 
 
        // for small pages with total height less then height of the viewport
        if(yScroll < windowHeight){
            pageHeight = windowHeight;
        } else {
            pageHeight = yScroll;
        }
        // for small pages with total width less then width of the viewport
        if(xScroll < windowWidth){ 
            pageWidth = windowWidth;
        } else {
            pageWidth = xScroll;
        }

        arrayPageSize = new Array(pageWidth,pageHeight,windowWidth,windowHeight)
        return arrayPageSize;
    },
    isValidEmail: function(emailAddress) {
        var pattern = /^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
        return pattern.test(emailAddress);
    },
    isNickName: function(name) {
        var pattern = /^[\w|\u4e00-\u9fa5]{2,12}$/i;
        return pattern.test(name);
    },
    isPassword: function(pwd) {
        var pattern = /^\w{6,16}$/i;
        return pattern.test(pwd);
    },
    checkBrowser: function() {
        if (document.all && !document.querySelector) {
            alert('您使用的是ie浏览器，但版本过低，请使用chrome、firefox、或用ie8或ie更高版本，或者携带以上内核的浏览器，如QQ，搜狗等。');
        }
    },
    // 增加输入框提示（主要是为了兼容ie）
    placeholder: function() {
        $('input, textarea').placeholder();
    },
    dateBeautify: function(date) {
        var hour      = 60 * 60 * 1000,
            day       = 24 * hour,
            currDate  = this.dateFormat(new Date, 'yyyy-MM-dd'),
            today     = new Date(currDate + ' 00:00:00').getTime(),
            yesterday = today - day,
            currTime  = date.getTime(),
            cHStr     = this.dateFormat(date, 'hh:mm:ss');

        if (currTime >= today) {
            var time    = (currTime - today) / hour;
            var cHour   = date.getHours();
            var amCHour = cHour - 12;
            var cMStr   = this.dateFormat(date, 'mm:ss');
            var str     = time <= 12? '上午 ' + cstr:'下午 ' + (amCHour < 10? amCHour: '0' + amCHour) + ':' + cMStr;
            return str;
        }else if (currTime < today && currTime >= yesterday) {
            return "昨天 " + cHStr;
        }else {
            return this.dateFormat(date, 'yyyy-MM-dd hh:mm:ss');
        }
    },
    dateFormat: function(date, format){
        var o = {
            "M+" : date.getMonth()+1, //month
            "d+" : date.getDate(),    //day
            "h+" : date.getHours(),   //hour
            "m+" : date.getMinutes(), //minute
            "s+" : date.getSeconds(), //second
            "q+" : Math.floor((date.getMonth()+3)/3),  //quarter
            "S" : date.getMilliseconds() //millisecond
        }

        if(/(y+)/.test(format)) format=format.replace(RegExp.$1,
                (date.getFullYear()+"").substr(4 - RegExp.$1.length));
        for(var k in o) if(new RegExp("("+ k +")").test(format))
            format = format.replace(RegExp.$1,
                    RegExp.$1.length==1 ? o[k] :
                    ("00"+ o[k]).substr((""+ o[k]).length));

        return format;
    },
    limitWordFun: function(limit, ev) {
        var $input = $(ev.target),
            num    = $.trim($input.val()).length,
            lave   = limit - num,
            tips   = $input.data('tips');

        if (lave <= 10) {
            if (!tips) {
                $input.after('<p class="lave">0</p>');
                $input.data('tips', true);
            }
            $input.next('.lave').text(lave);
            if (lave <= 0) {
                $input.next('.lave').addClass('color-warning');
            }else{
                $input.next('.lave').removeClass('color-warning');
            }
        }else{
            if (tips) {
                $input.next('.lave').remove();
                $input.data('tips', false);
            }
        }
    },
    bindWordLimitTips: function($selector, limit) {
        var self = this;
        if (arguments && arguments[2]) {
            var etarget = arguments[2];
            $selector.on('keydown, input', etarget, $.proxy(self.limitWordFun, self, limit));
        }else{
            $selector.on('keydown, input', $.proxy(self.limitWordFun, self, limit));
        }
    },
    showSigninPop: function() {
        var pagesize = common.getPageSize();
        var $signin_pop = $('#signin-pop');
        $('.modal').show();
        $signin_pop.css({
            top: (pagesize[3] - $signin_pop.height()) * .2,
            left: (pagesize[2] - $signin_pop.width()) / 2
        }).show();
        $(document).off('keypress').on('keydown', function(event) {
            if (event.keyCode === 27) {
                $('.modal').hide();
                $signin_pop.hide();
            }
        });
        $signin_pop.find('a.close')
        .off('click')
        .on('click', function() {
            $('.modal').hide();
            $signin_pop.hide();
        });
    },
    bindSigninCtrl: function($signin_btn) {
        var self = this;
        $signin_btn.click(function() {
            self.showSigninPop();
        });
    },
    bindCreatCtrl: function($create_btn) {
        var self = this;
        $create_btn.click(function() {
            self.dreamPop.show({
                did: "",
                url: '/dream/new',
                tips: "创建想法",
                title: $.trim($('.search-in').val())
            });
        });
    },
    followManager: function() {
        var isFollow = $(this).data('isfollow');
        var $self = $(this);
        if (!isFollow) {
            $.ajax({
                url: "/user/follow",
                data: {
                    fid: $(this).data('fid')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    common.xhrReponseManage(data, function(data) {
                        if (data.result === 0) {
                            $self.text("取消关注");
                            $self.data('isfollow', true);
                        }
                    });
                },
                error: function() {

                }
            });
        }else{
            $.ajax({
                url: "/user/cfollow",
                data: {
                    fid: $(this).data('fid')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    common.xhrReponseManage(data, function(data) {
                        if (data.result === 0) {
                            $self.text("关注");
                            $self.data('isfollow', false);
                        }
                    });
                },
                error: function() {
                }
            });
        }
    },
    bindUserCtrl: function() {
        var self = this;

        // 关注
        $('.follow').click(function(ev) {
            self.followManager.call(this, ev);
        });

        // 打招呼
        /*$('.message-add').click(function() {
            var pagesize = common.getPageSize();
            var $message_pop = $('#message-pop');
            $('.modal').show();
            $message_pop.css({
                top: (pagesize[3] - $message_pop.height()) * .2,
                left: (pagesize[2] - $message_pop.width()) / 2
            }).show();
            $(document).unbind('keypress').on('keydown', function(event) {
                if (event.keyCode === 27) {
                    $('.modal').hide();
                    $message_pop.hide();
                }
            });
            $message_pop.find('a.close').unbind('click').on('click', function() {
                $('.modal').hide();
                $message_pop.hide();
            });
        });*/

    },
    autoScroll: function(obj) {
        if (this.isScroll) {
            $(obj).find("ul:first").animate({
                marginTop: "-25px"
            }, 500, function () {
                $(this).css({ marginTop: "0px" }).find("li:first").appendTo(this);
            });
        }
    }, 
    xhrReponseManage: function(data, callback) {
        var self = this;
        switch (data.result) {
            case 0:
                callback(data);
                break;
            case 1:
                alert(data.info);
                break;
            case 2:
                self.showSigninPop();
                break;
            default:
                break;
        };
    }
};

common.Page = Backbone.View.extend({
    tagName: "div",

    className: "page-area pagination",

    events: {
        "click a":          "loadList"
    },

    initialize: function(opts) {
        _.extend(this, opts);
        this.render();
        //this.listenTo(this.model, "change", this.render);
    },

    updateOpts: function(opts) {
        _.extend(this, opts);
    },

    render: function() {
        var self  = this,
            total    = this.total,
            currPage = this.currPage,
            limit    = this.limit;

            // 显示分页
        var ptpl      = '',
            pageCount = Math.ceil(total / limit),
            prePage   = 0,
            nextPage  = 0,
            preData   = '',
            nextData  = '',
            preClass  = '',
            preClass  = 'class="disable"',
            nextClass = 'class="disable"';
        
        if (pageCount < 2) return;

        if (currPage > 1) {
            prePage = Math.max(1, currPage - 1);
            preData ='data-num="' + prePage + '"';
            preClass = '';
        }

        if (currPage < pageCount) {
            nextPage = Math.min(pageCount, currPage + 1);
            nextData ='data-num="' + nextPage + '"';
            nextClass = '';
        }

        ptpl += '<a ' + preData + ' ' + preClass + ' href="javascript:;">上一页</a>';

        var firstClass = '';
        if (currPage == 1) {
            firstClass = 'class="curr"';
        }
        ptpl += '<a ' + firstClass + ' data-num="1" href="javascript:;">1</a>';

        var start = 2,
        rand  = 3;

        if (pageCount > 3 && currPage > pageCount - 3) {
            start = pageCount - 3;
        }
                
        if (currPage > 3 && currPage <= pageCount - 3) {
            start = prePage;
        }

        start = Math.max(2, start);

        if (start > 2) {
            ptpl += '...'
        }

        for (var p = start, l = pageCount; p < l && p < start + rand; p++) {
            var pageClass = '';
            if (p == currPage) {
                pageClass = 'class="curr"';
            }
            ptpl += '<a ' + pageClass + ' data-num="' + p + '" href="javascript:;">' + p + '</a>';
        }
        if (p < pageCount) {
            ptpl += '...'
        }


        if (pageCount > 1) {
            var lastClass = '';
            if (currPage == pageCount) {
                lastClass = 'class="curr"';
            }
            ptpl += '<a ' + lastClass + ' data-num="' + pageCount + '" href="javascript:;">' + pageCount + '</a>';
        }
        ptpl += '<a ' + nextData + ' ' + nextClass + ' href="javascript:;">下一页</a>';

        this.$el.html(ptpl);

    },

    loadList: function(ev) {
        var page = $(ev.target).data('num');
        this.list.loadList(page, $.proxy(this.render, this));
    }
});

common.dreamPop = {
    el: '#dream-pop',
    modal: '.modal',
    init: function() {
        this.$el = $(this.el);
        this.$modal = $(this.modal);

        this.bindCloseCtrl();
        this.bindFinishCtl();

        var $popup = this.$el,
            $input = $popup.find('input[type="text"]');
            $textarea = $popup.find('textarea');
        common.bindWordLimitTips($input, 100);
        common.bindWordLimitTips($textarea, 150);
    },
    show: function(fields) {
        var pagesize = common.getPageSize();
        this.$modal.show();
        var $popup = this.$el;
        
        $popup.find('form').attr('action', fields && fields.url);

        $popup.find('input[type="hidden"]').val(fields && fields.did);

        $popup.find('span.title', 'div.hd').text(fields && fields.tips);

        $popup.css({
            top: (pagesize[3] - $popup.height()) * .2,
            left: (pagesize[2] - $popup.width()) / 2
        }).show().find('input[type="text"]').val(fields && fields.title);

        $popup.find('textarea').val(fields && fields.description)
    },
    close: function() {
        this.$modal.hide();
        this.$el.hide();
    },
    finish: function() {
        self.close();
    },
    bindCloseCtrl: function() {
        var self = this,
        $popup = this.$el;

        $(document).off('keypress').on('keydown', function(event) {
            if (event.keyCode === 27) {
                self.close();
            }
        });

        $popup.find('a.close')
            .off('click')
            .on('click', $.proxy(self.close, self));
    },
    bindFinishCtl: function() {
        $popup = this.$el;
        $popup.find('#finish_cdream_btn')
            .off('click')
            .on('click', function() {
                //var formData = {};
                // 校验
                /*$create_pop.find('p.field').each(function() {
                  var $widget = $(this).children();
                  formData[$widget.attr('name')] = $.trim($widget.val());
                  });*/
                self.finish();
            });
    }
};

$(function() {
    common.checkBrowser();
    common.placeholder();

    common.dreamPop.init();
    if ($('#create_dream_btn').data('isauthenticated')) {
        common.bindCreatCtrl($('#create_dream_btn'));
    }else{
        common.bindSigninCtrl($('#create_dream_btn'));
    }
    //setInterval($.proxy(common.autoScroll, common, "#reference"), 2000);

    // 查看消息列表
    var $msgNav = $('#message-nav');
    $msgNav.find('[rel="msg-view"]').data('show', false).click(function() {
        var $list   = $msgNav.find('.message-list'),
            $newTag = $msgNav.find('.message-new'),
            $this   = $(this);

        if (!$this.data('show')) {
            $list.text('加载中...').show();
            $this.data('show', true);
            $.ajax({
                url: "/message/view",
                method: "GET",
                dataType: "json",
                success: function(data) {
                    common.xhrReponseManage(data, function() {
                        if (data.data && data.data.length > 0) {
                            var html = data.data.map(function(item) {
                                return '<li>' + item.title + '<a href="' + item.url + '"> ' + item.content + '</a> <a class="btn btn-small" data-mid="' + item._id + '">移除</a></li>'
                            }).join('');
                            $list.html(html).show();
                            $list.append('<li class="view-all"><a href="/message">查看所有消息</a></li>').off('click')
                                .on('click', 'a.btn', function() {
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
                            $newTag.remove();
                            return;
                        }
                        $list.html("没有消息。").show();
                    });
                },
                error: function() {
                    $list.text('加载失败。');
                }
            });
        } else {
            $list.hide();
            $this.data('show', false);
        }

        $(document).off('mousedown').on('mousedown', function(event) {
            if ($this.data('show') && event.target !== $list[0] && !$.contains($list[0], event.target)) {
                $list.hide();
                $this.data('show', false);
            }
        });
    });

    $(".list-arrow").data('show', false).click(function() {
        var $list = $('.config-list');

        if (!$(this).data('show')) {
            $list.show();
            $(this).data('show', true);
        }else{
            $list.hide();
            $(this).data('show', false);
        }
        
        var $this =$(this);
        $(document).unbind('mousedown').on('mousedown', function(event) {
            if ($this.data('show') && event.target !== $list[0] && !$.contains($list[0], event.target)) {
                $list.hide();
                $this.data('show', false);
            }
        });
    });

    $("#reference").hover(function() {
        common.isScroll = false;
    }, function() {
        common.isScroll = true;
    });
});

return common;
});
