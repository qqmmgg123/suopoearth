requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'common': 'common',
        'backbone' : 'backbone-min'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
     $(function() {
        $("#signup-btn").click(function(e) {
            var formData = {};
            var validate = true;
            var $form = $('#signup-form');
            $form.find('input').each(function() {
                var $this = $(this);
                var val = $this.val();
                var $field = $this.closest('.field');
                var label = $field.prev('p.label').find('label').text();
                var $tips = $field.next('.validate-error');

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
                        if (!common.isValidEmail(val)) {
                            errorText = label + "的格式书写错误";
                            validate = false;
                            isValid = false;
                        }
                        break;
                    case 'nickname':
                        if (!common.isNickName(val)) {
                            errorText = label + "须是2~12个小写字母或数字或中文组成";
                            validate = false;
                            isValid = false;
                        }
                        break;
                    case 'password':
                        if (!common.isPassword(val)) {
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
                $form.replaceWith("<p>正在发送认证邮件至您的邮箱...请稍等</p>");
            }
            return validate;
        });
    });   
});
