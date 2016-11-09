(function(root) {
    var popup        = require('popup'),
        Cropper      = require('cropper'),
        cropTpl      = require("ejs!./croppop.ejs"),
        $            = require("jquery");

    var cropBoxData,
        canvasData,
        cropper,
        cropPop      = popup({
            width  : 'auto',
            height : 'auto',
            html   : cropTpl(),
            onClose : function() {
                cropBoxData = cropper.getCropBoxData();
                canvasData = cropper.getCanvasData();
                cropper.destroy();
            }
        }),
        chooseBtn    = document.querySelector('#pic-choose'),
        imageUpload  = document.querySelector('#image-upload');

    function readURL(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                console.log('show...');
                cropPop.show();
                var imagePreview = document.querySelector('#image-preview');
                imagePreview.src = e.target.result;
                cropper = new Cropper.default(imagePreview, {
                    autoCropArea: 0.5,
                    ready: function () {

                        // Strict mode: set crop box data first
                        cropper.setCropBoxData(cropBoxData).setCanvasData(canvasData);
                    }
                });
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

    function uploadImage() {
        var file = this.files[0];
        var fd = new FormData();
        fd.append("avatar", file);
        //fd.append("username", "Groucho");
        //fd.append("accountnum", 123456);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/avatar/upload', true);

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                var percentComplete = (e.loaded / e.total) * 100;
                console.log(percentComplete + '% uploaded');
            }
        };
        xhr.onload = function() {
            if (this.status == 200) {
                var resp = JSON.parse(this.response);
                console.log('Server got:', resp);
                console.log('show...');
                cropPop.show();
                var imagePreview = document.querySelector('#image-preview');
                imagePreview.src = resp.dataUrl;
                cropper = new Cropper.default(imagePreview, {
                    autoCropArea: 0.5,
                    ready: function () {
                        // Strict mode: set crop box data first
                        cropper.setCropBoxData(cropBoxData).setCanvasData(canvasData);
                    }
                });
            };
        };
        xhr.send(fd);
    }

    imageUpload.addEventListener('change', uploadImage, false);

    chooseBtn.addEventListener('click', function() {
        imageUpload.click();
    }, false)
})(this);
