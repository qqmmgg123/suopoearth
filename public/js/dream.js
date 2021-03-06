requirejs.config({
    paths   : {
        'const': '../const',
        'rules': 'rules',
        'wysihtml': 'wysihtml',
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone' : 'backbone-min',
        'validation': 'validate',
        'face'  : 'face',
        'common': 'common',
        'share' : 'share',
        'text'  : 'text',
        'template' : '../template'
    }
});

define([
    'rules',
    'wysihtml',
    'const/settings',
    'underscore',
    'jquery',
    'face',
    'common',
    'share',
    'text!template/' + category + 'list.html'
], function (rules, wysihtml, settings, _, $, face, common, Share, itemsTpl) {
    $(function() {
        // 绑定用户操作
        common.bindUserCtrl();

        // 心路故事发布输入框
        common.bindWordLimitTips($('.textarea-field').find('textarea'), 140);

        var text = settings.COMMENT_TEXT;

        // 历程列表
        var nodelist = {
            el: '#node-list',
            category: 'node',
            climit: 10,
            init: function() {
                this.$el = $(this.el);
                var $currentView      = 
                    this.$currentView = 
                    this.$el.find('#currView'),
                    $currentShow      =
                    this.$el.find('#currShow');
                
                if (this.$currentView.length > 0) {
                    var $belong = $currentView.find('.ctrl-area'),
                        $commentArea = $belong.find('.comment-area'),
                        isauthenticated = $currentView.data('isauthenticated');

                    var opts = {
                        blid  : $belong.data('blid'),
                        bl    : $belong.data('bl'),
                        did   : $belong.data('did'),
                        $belong  : $belong,
                        $commentArea : $commentArea,
                        isauthenticated : isauthenticated,
                        total : $belong.find('.comment').data('total'),
                        currPage : $commentArea.find('.comment-page').data('page')
                    }

                    this.layoutComments(opts);
                    this.bindComentInput(opts);
                    this.layoutCommentPage(opts);
                    $commentArea.show();

                    // 滚动到具体显示对象位置
                    var top = $currentShow.position().top;
                    $('html, body').animate({
                        scrollTop: top
                    }, 360, function() {
                        $currentShow.css('border', '1px solid #eee');
                    });
                }
                
                this.bindEvent();
                
                // 需要绑定文字限制的输入框
                var etarget = 'textarea[rel="comment-input"],textarea[rel="reply-input"]'

                common.bindWordLimitTips(this.$el, 140, etarget);
            },
            bindEvent: function() {
                var self = this;

                var selectors = ['#load-nodes-prev', '#load-nodes-next', '[rel="node-delete"]', '.comment', 'button.btn-comment'],
                    handles   = [
                        this.loadMorePrevItems,
                        this.loadMoreItems,
                        this.itemDelete,
                        this.showComments,
                        this.createComment
                    ];

                this.$el.on('click', selectors.join(','), function(ev) {
                    var $this = $(ev.currentTarget);
                    
                    for (var i = 0, l = selectors.length; i < l; i++) {
                        var selector = selectors[i],
                            handle   = handles[i];

                        if ($this.is(selector)) {
                            handle.call(self, ev);
                        }
                    }
                });
            },
            layoutCommentPage: function(opts) {
                var self  = this,
                    total = opts.total,
                    currPage = opts.currPage,
                    $belong  = opts.$belong,
                    $commentArea = opts.$commentArea;

                // 显示分页
                var ptpl      = '',
                    pageCount = Math.ceil(total / this.climit),
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
                
                $commentArea.find('.comment-page').html(ptpl).off('click')
                .on('click', 'a', $.proxy(self.pageComments, self)).show();
            },
            bindComentInput: function(opts) {
                var $commentArea = opts.$commentArea,
                    isauthenticated = opts.isauthenticated;

                // 评论输入框操作
                $commentArea.find('textarea:first').off().on('focus', function() {
                    var $createBtn = $commentArea.find('.btn-area:first');
                    if (!$createBtn.data('show')) {
                        $createBtn.data('show', true).show();
                    }
                }).on('click', function() {
                    if (!isauthenticated) {
                        $commentArea.find('textarea:first').blur();
                        common.showSigninPop();
                    }
                });

                $commentArea.find('.comment-input').show();
            },
            loadMoreItems: function(ev) {
                console.log('common...');
                var self = this;
                // 加载更多历程
                var $this = $(ev.currentTarget),
                    did   = $this.data('did'),
                    nnext = $this.data('nnext');

                $.ajax({
                    url: "/dream/" + did + "/" + this.category + "s",
                    data: {
                        nnext: nnext
                    },
                    method: "GET",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function() {
                            if (data) {
                                data.data.current = {
                                    id: did
                                };

                                data.data.text = text;

                                data = _.extend(data, { 
                                    timeFormat: function(date) {
                                        var date = new Date(date);
                                        return common.dateBeautify(date);
                                    }
                                });

                                var template = _.template(itemsTpl);
                                self.$el.append(template(data));
                                $this.closest('.process-node').remove();
                            }
                        });
                    },
                    error: function() {

                    }
                });
            },
            loadMorePrevItems: function(ev) {
                var self = this;

                // 加载更多历程
                var $this = $(ev.currentTarget),
                    did   = $this.data('did'),
                    nprev = $this.data('nprev');

                $.ajax({
                    url: "/dream/" + did + "/p" + this.category + "s",
                    data: {
                        nprev: nprev
                    },
                    method: "GET",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function() {
                            if (data) {
                                data.data.current = {
                                    id: did
                                };

                                data.data.text = text;

                                data.data.nodes.reverse();

                                data = _.extend(data, { 
                                    timeFormat: function(date) {
                                        var date = new Date(date);
                                        return common.dateBeautify(date);
                                    }
                                });

                                var template = _.template(itemsTpl);
                                self.$el.prepend(template(data));
                                $this.closest('.process-node').remove();
                            }
                        });
                    },
                    error: function() {

                    }
                });
            },
            itemDelete: function(ev) {
                // 删除历程
                var $this    = $(ev.currentTarget),
                    $belong  = $this.closest('.ctrl-area'),
                    $item    = $this.closest('.process-node'),
                    category = this.category;
                
                $.ajax({
                    url: "/" + category + "/delete",
                    data: {
                        itemid: $belong.data('blid')
                    },
                    method: "POST",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function() {
                            $item.fadeOut(function() {
                                $(this).remove();
                            });
                        });
                    },
                    error: function() {

                    }
                });
            },
            layoutComments: function(opts) {
                var self  = this,
                    blid  = opts.blid,
                    bl    = opts.bl,
                    did   = opts.did,
                    $belong  = opts.$belong,
                    $commentArea = opts.$commentArea,
                    isauthenticated = opts.isauthenticated;

                $commentArea.find('ul').off('click')
                .on('click', 'a.reply', function() {
                    if (!isauthenticated) {
                        common.showSigninPop();
                    }
            
                    var replyShow     = $(this).data('replyShow');
                    var $conmmentCurr = $(this).closest('li');
                    var $replyArea    = $conmmentCurr.find('.reply-area');
                    if (!replyShow) {
                        $replyArea.show();
                        $(this).data('replyShow', true);
                    } else {
                        $replyArea.hide();
                        $(this).data('replyShow', false);
                    }
                }).on('click', 'a[rel="comment-delete"]', function() {
                    var $conmmentCurr = $(this).closest('li'),
                        cid           = $conmmentCurr.data('cid');

                    $.ajax({
                        url: "/comment/delete",
                        data: {
                            cid: cid
                        },
                        method: "POST",
                        dataType: "json",
                        success: function(data) {
                            common.xhrReponseManage(data, function() {
                                $conmmentCurr.fadeOut(function() {
                                    $(this).remove();
                                });
                            });
                        },
                        error: function() {

                        }
                    });
                }).on('click', 'button.btn-reply', function() {
                    var $this         = $(this);
                    var $conmmentCurr = $this.closest('li');
                    var $replyArea    = $conmmentCurr.find('.reply-area');
                    var $textarea     = $replyArea.find('textarea');
                    var newcon        = $.trim($textarea.val());
                    var toid          = $conmmentCurr.data('uid');
                    var forid         = $conmmentCurr.data('cid');

                    if (!newcon) {
                        alert('评论不能为空');
                        return;
                    }

                    if (newcon.length > 140) {
                        alert('评论字数限制在140个字符内');
                        return;
                    }

                    $.ajax({
                        url: '/reply/new',
                        method: 'POST',
                        dataType: 'json',
                        data: {
                            bl      : bl,
                            did     : did,
                            blid    : blid,
                            toid    : toid,
                            forid   : forid,
                            content : newcon
                        },
                        success: function(data) {
                            $textarea.val('');

                            common.xhrReponseManage(data, function() {
                                opts = {
                                    $commentArea: $commentArea,
                                    $pageCacheEl: $belong.find('a.comment'),
                                    currPage: 1
                                }
                                self.renderComments(data, opts);
                            });
                        },
                        error: function() {

                        }
                    });
                });
            },
            renderComments: function(data, opts) {
                var self = this,
                    $commentArea = opts.$commentArea,
                    $pageCacheEl = opts.$pageCacheEl,
                    currPage     = opts.currPage;

                var tpl = "";
                $commentArea.find('ul').html(tpl);
                var total = data.count || '0';
                            
                // 缓存评论总数
                $pageCacheEl.data('total', total);

                if (data.comments && data.comments.length > 0) {
                    for (var i = 0, l = data.comments.length ;i < l; i++) {
                        var replyTpl = data.comments[i].isreply? '回复<a href="/user/' + data.comments[i]._reply_u + '">' + data.comments[i].other + '</a>':'';

                        tpl += '<li data-cid="' + data.comments[i]._id + '" data-uid="' + (data.comments[i]._belong_u? data.comments[i]._belong_u._id:'') + '">' + 
                            '<div class="user-info">' +
                            '<a class="avatar"><img src="/images/user_mini.png" /></a>' +
                            '<em class="username"><a href="/user/' + data.comments[i]._belong_u._id + '">' + data.comments[i].author + '</a>'
                            + replyTpl + ' ' + data.comments[i].date + '</em>' +
                            '</div>' +
                            '<p class="text">' + data.comments[i].content + '</p>' +
                            '<div>' +
                            '<a rel="comment-delete" href="javascript:;">' + (data.comments[i].isowner? '删除':'') + '</a> ' +
                            '<a class="reply" href="javascript:;">' + (data.comments[i].isowner? '':'回复') + '</a>' +
                            '</div>';
                        if (data.isauthenticated) {
                            tpl += '<div class="reply-area" style="display: none;">' +
                                '<textarea rel="reply-input" placeholder="说说你的看法..."></textarea>' +
                                '<button class="btn btn-reply">回复</button>' +
                                '</div>';
                        }

                        tpl += '</li>';
                    }

                    $commentArea.find('ul').html(tpl);

                    opts.isauthenticated = data.isauthenticated;
                    self.layoutComments(opts);
                    
                    opts.total = total;
                    opts.currPage = currPage;
                    self.layoutCommentPage(opts);
                }
            },
            loadComments: function(opts, callback) {
                var self  = this,
                    btype = opts.btype,
                    blid  = opts.blid,
                    bl    = opts.bl,
                    did   = opts.did,
                    currPage = opts.page,
                    $belong  = opts.$belong,
                    $pageCacheEl = opts.$pageCacheEl,
                    $commentArea = opts.$commentArea;

                $.ajax({
                    url: "/" + btype + "/" + blid + "/comments",
                    method: "GET",
                    data: {
                        page: currPage || 1
                    },
                    dataType: "json",
                    success: function(data) {
                        var tpl = "";
                        $commentArea.find('ul').html(tpl);
                        common.xhrReponseManage(data, function() {
                            var total = data.count || '0';
                            
                            // 缓存评论总数
                            $pageCacheEl.data('total', total);

                            if (data.comments && data.comments.length > 0) {
                                for (var i = 0, l = data.comments.length ;i < l; i++) {
                                    var replyTpl = data.comments[i].isreply? '回复<a href="/user/' + data.comments[i]._reply_u + '">' + data.comments[i].other + '</a>':'';

                                    tpl += '<li data-cid="' + data.comments[i]._id + '" data-uid="' + (data.comments[i]._belong_u? data.comments[i]._belong_u._id:'') + '">' + 
                                        '<div class="user-info">' +
                                        '<a class="avatar"><img src="/images/user_mini.png" /></a>' +
                                        '<em class="username"><a href="/user/' + data.comments[i]._belong_u._id + '">' + data.comments[i].author + '</a>'
                                        + replyTpl + ' ' + data.comments[i].date + '</em>' +
                                        '</div>' +
                                        '<p class="text">' + data.comments[i].content + '</p>' +
                                        '<div>' +
                                        '<a rel="comment-delete" href="javascript:;">' + (data.comments[i].isowner? '删除':'') + '</a> ' +
                                        '<a class="reply" href="javascript:;">' + (data.comments[i].isowner? '':'回复') + '</a>' +
                                        '</div>';
                                    if (data.isauthenticated) {
                                        tpl += '<div class="reply-area" style="display: none;">' +
                                            '<textarea rel="reply-input" placeholder="说说你的看法..."></textarea>' +
                                            '<button class="btn btn-reply">回复</button>' +
                                            '</div>';
                                    }

                                    tpl += '</li>';
                                }

                                $commentArea.find('ul').html(tpl);

                                opts.isauthenticated = data.isauthenticated;
                                self.layoutComments(opts);
                                
                                opts.total = total;
                                opts.currPage = currPage;
                                self.layoutCommentPage(opts);
                            }

                            callback(data);
                        });
                    },
                    error: function() {
                        var tpl = "<li>评论加载失败</li>";
                        $commentArea.find('ul').html(tpl);
                    }
                });
            },
            pageComments: function(ev) {
                var self = this,
                    $this = $(ev.currentTarget),
                    isDis = $this.hasClass('disable');

                if (isDis) return;

                // 添加提议
                var COMMENT_DREAM = 0,
                    COMMENT_NODE  = 1;

                var $belong = $this.closest('.ctrl-area'),
                    $commentArea = $belong.find('.comment-area');

                var blid  = $belong.data('blid'),
                    did   = $belong.data("did"),
                    bl    = $belong.data('bl'),
                    page  = $this.data('num');
                    btype = "";

                switch(bl) {
                    case settings.OBJEXT_TYPE.NODE:
                        btype = 'node';
                        break;
                    case settings.OBJEXT_TYPE.SUGGEST:
                        btype = 'suggest';
                        break;
                    case settings.OBJEXT_TYPE.EXPERIENCE:
                        btype = 'experience';
                        break;
                    default:
                        break;
                }

                var params = {
                    btype : btype,
                    blid  : blid,
                    bl    : bl,
                    did   : did,
                    page  : page,
                    $$belong     : $belong,
                    $pageCacheEl : $this,
                    $commentArea : $commentArea
                }

                self.loadComments(params, function(data) {
                    $commentArea.find('.comment-input').show();
                });
            },
            showComments: function(ev) {
                // 添加提议
                var self = this,
                    COMMENT_DREAM = 0,
                    COMMENT_NODE  = 1;

                var $this = $(ev.currentTarget),
                    $belong = $this.closest('.ctrl-area'),
                    $commentArea = $belong.find('.comment-area'),
                    editShow = $this.data('show');
    
                var blid  = $belong.data('blid'),
                    did   = $belong.data("did"),
                    bl    = $belong.data('bl'),
                    btype = "";

                switch(bl) {
                    case settings.OBJEXT_TYPE.NODE:
                        btype = 'node';
                        break;
                    case settings.OBJEXT_TYPE.SUGGEST:
                        btype = 'suggest';
                        break;
                    case settings.OBJEXT_TYPE.EXPERIENCE:
                        btype = 'experience';
                        break;
                    default:
                        break;
                }

                if (!editShow) {
                    // 显示并切换到展开评论状态
                    $commentArea.show();
                    $this.html('<i class="comment-icon"></i>' + text.COLLAPSE_COMMENT);
                    $this.data('show', true);

                    if (!$this.data('firstShow')) {
                        var loading = '<li>评论加载中...</li>';
                        $commentArea.find('ul.comment-list').html(loading)
                        var params = {
                            btype : btype,
                            blid  : blid,
                            bl    : bl,
                            did   : did,
                            page  : 1,
                            $belong      : $belong,
                            $pageCacheEl : $this,
                            $commentArea : $commentArea
                        }
                        self.loadComments(params, function(data) {
                            params.isauthenticated = data.isauthenticated;
                            self.bindComentInput(params);
                            $this.data('firstShow', true);
                        });
                    }
                }else{
                    var total = $this.data('total');
                    $commentArea.hide().find('textarea').blur();
                    $this.html('<i class="comment-icon"></i>' + text.EXPANSION_COMMENT + ' ' + total);
                    $this.data('show', false);
                }
            },
            createComment: function(ev) {
                var self         = this;
                var $this        = $(ev.currentTarget);
                var $belong      = $this.closest('.ctrl-area');
                var $commentArea = $belong.find('.comment-area');
                var $textarea    = $belong.find('textarea');
                var id           = $belong.data("blid");
                var did          = $belong.data("did");
                var bl           = $belong.data("bl");
                var newcon       = $.trim($textarea.val());

                if (!newcon) {
                    alert('评论不能为空');
                    return;
                }

                if (newcon.length > 140) {
                    alert('评论字数限制在140个字符内');
                    return;
                }

                var data = {
                    blid    : id,
                    did     : did,
                    bl      : bl,
                    content : newcon
                };

                var loading = '<li>评论加载中...</li>';
                $commentArea.find('ul.comment-list').html(loading);

                $.ajax({
                    url: "/comment/new",
                    data: data,
                    method: "POST",
                    dataType: "json",
                    success: function(data) {
                        common.xhrReponseManage(data, function(data) {
                            $textarea.val('');
                            
                            opts = {
                                $commentArea: $commentArea,
                                $pageCacheEl: $belong.find('a.comment'),
                                currPage: 1
                            }
                            self.renderComments(data, opts);
                        });
                    },
                    error: function() {

                    }
                });
            }
        };

        // 建议列表
        var suggestList = $.extend({}, nodelist, {
            el: '#suggest-list',
            category: 'suggest',
            createEditor: function() {
                if (document.getElementById(this.category + '-editor') !== null) {
                    var self = this;

                    this.editor = new wysihtml5.Editor("textarea", {
                        toolbar:        "toolbar",
                        stylesheets:    "/css/wysihtml5.css",
                        parserRules:    rules.config
                    });

                    var pbtn = document.getElementById('publish');

                    pbtn.onclick = function() {
                        console.log(self.editor.getValue(true));
                    }
                }
            }
        });

        // 心得列表
        var experienceList = $.extend({}, suggestList, {
            el: '#experience-list',
            category: 'experience'
        });

        nodelist.init();
        suggestList.init();
        suggestList.createEditor();
        experienceList.init();
        experienceList.createEditor();

        // 分享想法
        var dreamShare= new Share({
            "tit": $("#sharetitle").text() || "",
            "pic": $("#shareimg").attr("src") || "",
            "url": window.location.href,
            "intro": $("#shareintro").text() || ""
        });

        // 分享到豆瓣
        $('#db_share').bind('click',function(){
            dreamShare.postToDb();
        });

        // 分享到腾讯微博
        $('#qqwb_share').bind('click',function(){
            dreamShare.postToWb();
        });

        // 分享到新浪微博
        $('#xlwb_share').bind('click',function(){
            dreamShare.shareToSina();
        });


        // 删除想法
        $('[rel="dream-delete"]').click(function() {
            $.ajax({
                url: "/dream/delete",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    switch (data.result) {
                        case 0:
                            window.location.reload(true);
                            break;
                        case 1:
                            alert(data.info);
                            break;
                        case 2:
                            common.showSigninPop();
                            break;
                        default:
                            break;
                    };
                },
                error: function() {

                }
            });
        });

        // 修改想法
        $('[rel="dream-modify"]').click(function() {
            var $dreamContent = $('.content-area');
            common.dreamPop.show({
                did: $(this).data('did').toString(),
                url: '/dream/modify',
                tips: "修改心愿、想法",
                title: $dreamContent.find('h1').text(),
                description: $dreamContent.find('p.content').text()
            });
        });

        // 创建历程
        $('#node_create_btn').click(function() {
            var cval = $('#node_create_form').find("textarea").val();
            var dval = $('#node_create_form').find('input').val();
            var did = $.trim(dval);
            var newcon = $.trim(cval);
            if (newcon.length === 0) {
                alert("抱歉，您没有输入任何内容。");
                return false;
            }

            if (!did) {
                alert("缺少参数");
                return false;
            }
        });

        face().create({icon: '.face', editor: '#story-editor', tips: '.face-tips'});

    // 显示用户信息tips
    $('.friend').hover(
        function() {
            $(this).find('.tips').show();
        }, 
        function() {
            $(this).find('.tips').hide();
        }
    );

    // 回到顶部按钮
    $('.back-top').click(function() {
        $('html, body').animate({
            scrollTop: 0
        }, 360);
    });

    /*$('.dream-add').click(function() {
        var isAdd = $(this).data('isJoin');
        if (!isAdd) {
            $(this).find('p').text("取消参与");
            $(this).data('isJoin', true);
        }else{
            $(this).find('p').text("参与");
            $(this).data('isJoin', false);
        }
    });*/

    // 关注想法操作
    $('[rel="dream-good"]').click(function() {
        var isGood = $(this).data('isgood');
        var $self = $(this);
        if (!isGood) {
            $.ajax({
                url: "/dream/good",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    switch(data.result) {
                        case 0:
                            $self.text("取消关注想法");
                            $self.data('isfollow', true);
                            break;
                        case 1:
                            alert(data.info);
                            break;
                        case 2:
                            common.showSigninPop();
                            break;
                        default:
                            break;
                    }
                },
                error: function() {

                }
            });
        }else{
            $.ajax({
                url: "/dream/cfollowing",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    switch(data.result) {
                        case 0:
                            $self.text("关注该想法");
                            $self.data('isfollow', false);
                            break;
                        case 1:
                            alert(data.info);
                            break;
                        case 2:
                            common.showSigninPop();
                            break;
                        default:
                            break;
                    }
                },
                error: function() {
                }
            });
        }
    });

    // 关注想法操作
    $('[rel="dream-follow"]').click(function() {
        var isFollow = $(this).data('isfollow');
        var $self = $(this);
        if (!isFollow) {
            $.ajax({
                url: "/dream/following",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    switch(data.result) {
                        case 0:
                            $self.text("取消关注想法");
                            $self.data('isfollow', true);
                            break;
                        case 1:
                            alert(data.info);
                            break;
                        case 2:
                            common.showSigninPop();
                            break;
                        default:
                            break;
                    }
                },
                error: function() {

                }
            });
        }else{
            $.ajax({
                url: "/dream/cfollowing",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    switch(data.result) {
                        case 0:
                            $self.text("关注该想法");
                            $self.data('isfollow', false);
                            break;
                        case 1:
                            alert(data.info);
                            break;
                        case 2:
                            common.showSigninPop();
                            break;
                        default:
                            break;
                    }
                },
                error: function() {
                }
            });
        }
    });

    common.statistics();
});
});
