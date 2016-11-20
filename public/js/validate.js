define(['jquery', 'utilities'], function ($, util) {
    var defaultOpts = {
        form: ".form"
    }

    var validation = function(opts) {
        this.$form = $(opts.form),
        this.$submitBtn = $(opts.form).find('[type="submit"]');
    }

    validation.prototype.init = function() {
        var self = this;

        this.$submitBtn.off('click').on('click', function(e) {
            var formData = {};
            var validate = true;
            self.$form.find('input').each(function() {
                var $this = $(this),
                    val    = $this.val(),
                    $field = $this.closest('.field'),
                    dlabel = $field.prev('p.label').find('label').text(),
                    label  = $this.data('label') || dlabel,
                    $tips  = $field.next('.validate-error');

                // 判断是否为空
                if ($.trim(val).length === 0) {
                    $tips.text(label + "未填写").show();
                    validate = false;
                    return;
                }else{
                    $tips.text("").hide();
                }

                var isValid = true;
                var errorText = "";
                // 判断是否有效
                switch(this.name) {
                    case 'username':
                        if (!util.isValidEmail(val)) {
                            errorText = label + "的格式书写错误";
                            validate = false;
                            isValid = false;
                        }
                        break;
                    case 'nickname':
                        if (!util.isNickName(val)) {
                            errorText = label + "须是2~12个小写字母或数字或中文组成";
                            validate = false;
                            isValid = false;
                        }
                        break;
                    case 'password':
                        if (!util.isPassword(val)) {
                            errorText = label + "须是6~16个字符的小写字母或数字组成";
                            validate = false;
                            isValid = false;
                        }
                        break;
                    default:
                        break;
                }
                if (!isValid) {
                    $tips.text(errorText).show();
                }else{
                    $tips.text("").hide();
                }
                formData[this.name] = $(this).val();
            });
        
            if (validate) {
                self.$form.replaceWith("<p>正在发送认证邮件至您的邮箱...请稍等</p>");
            }
            return validate;
        });
    }

    return validation;
});
