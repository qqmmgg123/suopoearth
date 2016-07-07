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
            alert('您使用的是ie浏览器，但版本过低，请使用chrome、firefox、或用ie7以上版本，或者携带以上内核的浏览器，如QQ，搜狗等。');
        }
    },
    isSupportPh: function() {
        var i = document.createElement("input");
        return "placeholder" in i;
    },
    // 增加输入框提示（主要是为了兼容ie）
    placeholder: function() {
        var va; // value
        var ph; // placeholder
        if (!this.isSupportPh()) {
            $('input[type=text]').each(function() {
                va = $(this).val();
                ph = $(this).attr('placeholder');
                // if the value is empty, put the placeholder value in it's place
                if (!va || va == '') {
                    $(this).val(ph);
                }
            });

            $('input[type=text]').unbind("focus");
            $('input[type=text]').unbind("blur");

            // replaceing the placeholder type effect
            $('input[type=text]').focus(function() {
                va = $(this).val();
                ph = $(this).attr('placeholder');
                if (va == ph) {
                    $(this).val('');
                    $(this).css('color', '#333')
                }
            }).blur(function() {
                va = $(this).val();
                ph = $(this).attr('placeholder');
                if (va == '') {
                    $(this).val(ph);
                    $(this).css('color', '#999')
                }
            });
        }
    },
    showSigninPop: function() {
        var pagesize = common.getPageSize();
        var $signin_pop = $('#signin-pop');
        $('.modal').show();
        $signin_pop.css({
            top: (pagesize[3] - $signin_pop.height()) / 2,
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
    bindUserCtrl: function() {
        // 关注
        $('.follow').click(function() {
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
                        alert(data.info);
                        if (data.result === 0) {
                            $self.text("取消关注");
                            $self.data('isfollow', true);
                        }
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
                        alert(data.info);
                        if (data.result === 0) {
                            $self.text("关注");
                            $self.data('isfollow', false);
                        }
                    },
                    error: function() {
                    }
                });
            }
        });

        // 打招呼
        $('.message-add').click(function() {
            var pagesize = common.getPageSize();
            var $message_pop = $('#message-pop');
            $('.modal').show();
            $message_pop.css({
                top: (pagesize[3] - $message_pop.height()) / 2,
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
        });

    },
    autoScroll: function(obj) {
        if (this.isScroll) {
            $(obj).find("ul:first").animate({
                marginTop: "-25px"
            }, 500, function () {
                $(this).css({ marginTop: "0px" }).find("li:first").appendTo(this);
            });
        }
    }
};

common.dreamPop = {
    el: '#dream-pop',
    modal: '.modal',
    init: function() {
        this.$el = $(this.el);
        this.$modal = $(this.modal);

        this.bindCloseCtrl();
        this.bindFinishCtl();
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
    setInterval($.proxy(common.autoScroll, common, "#reference"), 2000);

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
})