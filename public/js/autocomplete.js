define([jquery], function ($) {
    var AutoComplete = function () {
        this.AUTHOR = "qiuminggang";
        this.ctype = "autoComplete";
        this.ids = [],this.idsObj = {};
    };

    Selector.prototype = {
        addClass: function(node,name){
            var cls = node.className,reg = new RegExp("( )" + name,'g');
            if(cls.length===0) node.className = name
            else if(!reg.test(' '+cls)) node.className += " " + name
        },
        removeClass: function(node,name){
            var cls = node.className,reg = new RegExp("( )" + name,'g'),str = ' '+cls;
            if(reg.test(str)) node.className = str.replace(reg,'').replace(/^ /,'');
        },
        addHover: function(){
            var self = this;
            this.input.onmouseover = function(){
                self.addClass(self.input,'over')
            }
            this.input.onmouseout = function(){
                self.removeClass(self.input,'over')
            }
        },
        removeHover: function(){
            this.input.onmouseover = null;
            this.input.onmouseout = null;
        },
        loadOpt: function(opt){
            var self = this;
            this.listStr = '';
            this.closeBtn = this.topBar = false;
            for(var v in opt){
                switch(v){
                    case 'id':
                        this.input = document.getElementById(opt[v]);
                        if(this.input.tagName.toLowerCase() !== "input"){
                            this.addClass(this.input,"selector")
                        }
                        this.addHover();
                        break;
                    case 'width':
                        this.width = opt[v] === 'auto'? $(this.input).width() + 2:opt[v];
                        break;
                    case 'topBar':
                    case 'closeBtn':
                    case 'title':
                    case 'option':
                    case 'arrowColor':
                    case 'defaultVal':
                    case 'defaultKey':
                    case 'sendType':
                    case 'onchange':
                    case 'zIndex':
                    case 'container':
                    case 'showError':
                    case 'type':
                    case 'data':
                    case 'success':
                    case 'url':
                        this[v] = opt[v];
                        break;
                }
            }
            this.view();
        },
        loadList: function(){
            var tpl = '';
            if(this.option.length > 0){
                tpl += '<ul class="sellist">'
                for(var i in this.option){
                    var key = this.option[i][this.key],
                    tpl += '<li data-val="'+ this.option[i][this.val] +'">' + key + '</li>'
                }
                tpl += '</ul>';
            }
            this.listStr = tpl;
        },
        setVal:function(key,val){
            var arrow = this.arrowColor === 'blue'? "list":"arrow";
            this.input.innerHTML = "<span>"+　key　+"</span> <img src='/resources/images/"+ arrow +".gif'>";
            this.value = val;
        },
        view: function(){
            var self = this;
            self.visible = false;
            var index = -1;

            function setv(){
                if(self.defaultVal === undefined){
                    if(self.option != undefined){
                        self.setVal(self.option[0][self.key],self.option[0][self.val]);
                    }
                }else{
                    self.setVal(self.defaultKey,self.defaultVal);
                }
            }

            var opt = {
                width: this.width + 'px',
                color: '#fff',
                borderCss: '1px solid #ccc',
                topBar: self.topBar,
                closeBtn : self.closeBtn,
                type: self.type !== undefined? self.type:'local',
                arrow: false,
                zIndex: self.zIndex,
                container: self.container
            }

            if(self.title !== undefined) opt['title'] = self.title;

            if(self.type === "ajax"){
                self.url && (opt['url'] = self.url);
                self.data && (opt['data'] = self.data);
                self.setVal(self.defaultKey,self.defaultVal);
                opt['success'] = function(data){
                    self.option = data;
                    self.loadList();
                    this.items.innerHTML = self.listStr;
                }
            }else{
                setv();
                if(self.option !== undefined){
                    self.loadList();
                    opt['content'] = self.listStr;
                }
            }

            this.select = tipss.createTip(opt);
            self.select.div.onclick = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                var el = e.srcElement || e.target;
                if(el.tagName.toLowerCase() == "li"){
                    var lis = this.getElementsByTagName('li');
                    for(var i=0;i<lis.length;i++){
                        var checkbox = $.getElByClassName(lis[i],'checkBox');
                        $.removeClass(checkbox,'on')
                    }
                    var checkbox = $.getElByClassName(el,'checkBox');
                    self.addClass(checkbox,'on');
                    self.value = el.getAttribute('data-val');
                    self.loadList();
                    self.select.content = self.listStr;
                    self.input.getElementsByTagName('span')[0].innerHTML = el.lastChild.nodeValue;
                    self.value = el.getAttribute('data-val');
                    self.addHover();
                    self.removeClass(self.input,'over')
                    self.select.hide();
                    self.visible = false;
                    if(self.onchange instanceof Function) self.onchange.call(self,el);
                }
            }

            self.select.div.onmouseover = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                var el = e.srcElement || e.target;
                if(el.tagName.toLowerCase() == "li"){
                    self.addClass(el,'over');
                }
            }

            self.select.div.onmouseout = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                var el = e.srcElement || e.target;
                if(el.tagName.toLowerCase() == "li"){
                    self.removeClass(el,'over')
                }
            }

            function arrowCtl(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                var keyCode = e.keyCode || e.which,_self;
                switch(keyCode){
                    case 40:
                        if($.activeSel.ctype === 'selector' || $.activeSel.ctype === 'autoComplete') _self = $.activeSel;
                        else return;
                        var list = _self.select.div.getElementsByTagName('ul')[0].childNodes;
                        if(this.visible)
                            e.returnValue = false;
                        if(e.preventDefault) e.preventDefault();
                        index += 1;
                        if(index > list.length-1)
                            index = 0;
                        if(list){
                            for(var i=0;i<list.length;i++){
                                $.removeClass(list[i],'over')
                            }
                            self.addClass(list[index],'over');
                        }
                        break;
                    case 38:
                        if($.activeSel.ctype === 'selector' || $.activeSel.ctype === 'autoComplete') _self = $.activeSel;
                        else return;
                        var list = _self.select.div.getElementsByTagName('ul')[0].childNodes;
                        if(this.visible)
                            e.returnValue = false;
                        if(e.preventDefault) e.preventDefault();
                        index -= 1;
                        if(index < 0)
                            index = list.length-1;
                        if(list){
                            for(var i=0;i<list.length;i++){
                                $.removeClass(list[i],'over')
                            }
                            self.addClass(list[index],'over');
                        }
                        break;
                    case 8:
                        if(self.input.tagName.toLowerCase() == "input"){
                            self.backSpace();
                        }
                        break;
                }
            }

            if(self.input.tagName.toLowerCase() == "input"){
                self.input.onkeydown = arrowCtl;
            }else{
                document.onkeydown = arrowCtl;
            }

            self.bindEvent();
        },
        blurClick: function(){
            if(this.visible){
                this.addHover();
                self.removeClass(this.input,'over');
                this.select.hide();
                this.visible = false;
            }
        },
        bindEvent: function(){
            var self = this,
            input = this.input,
            $input = $(input);

            self.select.div.onclick = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                var tar = e.srcElement || e.target,el;
                if(tar.tagName.toLowerCase() == "li"){
                    el = tar;
                }else if(tar.parentNode.tagName.toLowerCase() == 'li'){
                    el = tar.parentNode;
                }else if(tar.parentNode.parentNode.tagName.toLowerCase() == 'li'){
                    el = tar.parentNode.parentNode;
                }else{
                    this.onselectstart = new Function("return false");
                    return false;
                }
                var id = el.getAttribute('data-id'),
                    name = el.getAttribute('data-value');
                self.addTag(name,id);
                this.onselectstart = new Function("return false");
                return false;
            }

            function searStr(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);

                var $input = jQuery(this),
                    of = $input.offset(),
                    offsetTop = of['top'] + $input.height(),
                    offsetLeft = of['left'];

                if(self.container !== undefined){
                    var $con = jQuery(self.container),cof = $con.offset();
                    offsetTop = offsetTop - cof['top'],
                        offsetLeft = offsetLeft - cof['left'];
                }

                if(this.value.length !== 0){
                    var query = this.value,searchType;
                    self.select.content = "加载中..."
                    self.select.show(offsetTop,offsetLeft);
                    self.visible = true;
                    document.body.onclick = function(e){
                        var e = e || window.event;
                        e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                        self.blurClick()
                    };
                    if(self.sendType === "group") searchType = self.sendType;
                    else if(self.sendType === "class") searchType = "favour";

                    self.reqList(searchType,query,offsetTop,offsetLeft);
                }else{
                    self.showAll();
                }
            }

            input.parentNode.onclick = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                $.setCaretPosition(input,input.value.length);
            }

            input.onclick = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
            }

            input.onfocus = function(){
                if( $.activeSel!== undefined && $.activeSel.input !== this) $.activeSel.blurClick();
                self.showAll();
                $.activeSel = self;
            }

            if(input.oninput){
                input.oninput = searStr;
            }else if (input.attachEvent) {
                var v = parseInt($.IEV);
                if(v >= 9){
                    input.oninput = searStr;
                    input.attachEvent('onkeyup',function(e){
                        var e = e || window.event;
                        var keyCode = e.which || e.keyCode;
                        (keyCode === 8 ||　keyCode === 46) &&　searStr.call(input,e);
                    })
                    input.attachEvent('oncut',function(e){
                        searStr.call(input,e);
                    });
                    input.onclick = function(e){
                        searStr.call(this,e);
                    }
                }else if(v === 8 || v === 7){
                    if(v === 8){
                        input.onclick = function(e){
                            searStr.call(this,e);
                        }
                    }
                    input.attachEvent('onpropertychange',function(e){
                        if(e.propertyName == "value"){
                            searStr.call(input,e);
                        };
                    });
                }
            }
        },
        reqList: function(type, query, offsetTop, offsetLeft){
            var self = this,
                query = $.trim(query);
            jQuery.ajax({
                url:self.url,
                dataType: 'json',
                data:{type:type,query:query},
                type:'get',
                success: function(data){
                    self.success.call(self,data,query,offsetTop,offsetLeft);
                },
                timeout: 30000,
                error:function(){
                    self.select.content = "请求服务器失败。";
                    self.select.show(offsetTop,offsetLeft);
                    self.visible = true;
                    document.body.onclick = function(e){
                        var e = e || window.event;
                        e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                        self.blurClick()
                    };
                }
            });
        },

        showAll: function(){
            var self = this,
                input = self.input,
                query = jQuery.trim(input.value),searchType,
                $input = jQuery(input),
                of = $input.offset(),
                offsetTop = of['top'] + $input.height(),
                offsetLeft = of['left'];

            if(self.container !== undefined){
                var $con = jQuery(self.container),cof = $con.offset();
                offsetTop = offsetTop - cof['top'],
                    offsetLeft = offsetLeft - cof['left'];
            }

            self.select.content = "加载中...";
            self.select.show(offsetTop,offsetLeft);
            document.body.onclick = function(e){
                var e = e || window.event;
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
                self.blurClick()
            };

            if(query.length === 0){
                searchType = self.sendType;
            }else{
                if(self.sendType === "group") searchType = self.sendType;
                else if(self.sendType === "class") searchType = "favour";
            }
            self.reqList(searchType,query,offsetTop,offsetLeft);
        },

        backSpace: function(){
            var self = this;
            var input = this.input;
            if(input.value.length === 0 && input.previousSibling){
                var tag = input.previousSibling,
                    tn = jQuery.trim(tag.getAttribute("data-value"));
                self.delTag(tag);
                input.value = tn + '\x20';
            }
        }
    };
    var autocomplete = new AutoComplete();
    autocomplete.loadOpt(config);	
    return autocomplete;
});
