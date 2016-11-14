/*
 * @fileOverview 键盘操作
 * @version 0.1
 * @author minggangqiu
 */
(function(factory) {
    var keyboard = require('keyboard');

    module.exports = factory(keyboard);
})(function(keyboard) {
    function Popup(opts) {
        this.opts = opts;
        this.init();
    }

    Popup.prototype = {
        init: function() {
            var opts = this.opts || {};

            this.visible = false;
            this.width = opts.width || 400,
                this.height = typeof opts.height == 'number'? 
                opts.height:(typeof opts.height == "string"? 0:320);

            this.defaultOpts = {
                width: this.width,
                height: this.height,
                arrow: true,
                direction: 'top',
                modal: false,
                onClose: null,
                html: '',
                left: 0,
                top: 0
            }

            this.div = document.createElement('div');
            this.div.className = "dialog none";

            this.settings = opts;
        },
        setOpts: function(opts) {
            for (var o in this.defaultOpts) {
                switch (o.toLowerCase()) {
                    case 'width':
                    case 'height':
                    case 'left':
                    case 'top':
                        var value = opts[o]? opts[o]:this.defaultOpts[o];
                        if (typeof value == "number")
                            value += 'px';

                        this.div.style[o] = value;
                        break;
                    case 'arrow':
                        if (typeof opts[o] != "boolean") 
                            opts[o] = this.defaultOpts[o]

                        if (opts[o]) {
                            var arrowCls = ['arrow-border', 'arrow'];
                            for (var i=0;i<arrowCls.length;++i) {
                                var div = document.createElement('div');
                                div.className = arrowCls[i];
                                this.div.appendChild(div);
                                div = null;
                            }
                        }
                        break;
                    case 'direction':
                        var cls = opts[o]? opts[o]:this.defaultOpts[o];
                        this.div.className += ' ' + cls;
                        break;
                    case 'modal':
                        this.modal = document.createElement('div');
                        break;
                    case 'html':
                        this.div.innerHTML = opts[o]? opts[o]:this.defaultOpts[o];
                        break;
                    default:
                        this[o] = opts[o]? opts[o]:this.defaultOpts[o];
                        break;
                }
            }
        },
        bintEvents: function() {
            var self = this;
            function handle() {
                self.close();
                keyboard.removeHandle('escape_keydown', handle);
                self.onClose && self.onClose.call(self);
            }

            // 键盘操作关闭窗口
            keyboard.addHandle('escape_keydown', handle);
        },
        show: function() {
            var win_width = window.innerWidth;
            var win_height = window.innerHeight;

            this.defaultOpts.left = (win_width - this.width) * 0.5,
                this.defaultOpts.top  = (win_height - this.height) * 0.5,
                this.setOpts(this.settings);
            this.bintEvents();
            document.body.appendChild(this.div);
            document.body.appendChild(this.modal);

            this.div.className = this.div
                .className.replace(' none','');

            this.modal.className = "modal fade-out";
            var oheight = this.modal.offsetHeight;
            this.modal.className = "modal fade-in";

            this.visible = true;
        },
        close: function() {
            if (document.body.contains(this.div)) {
                document.body.removeChild(this.div);
                document.body.removeChild(this.modal);
                // this.modal = this.div = null;
                this.visible = false;
            }
        }
    };

    return function(opts) {
        return new Popup(opts);
    }
});
