$("#image-file").change(function (ev) {

    document.getElementById("images").style.display = "block";

    for (i = 0; i < this.files.length; i++) {
        var file = this.files[i];
        var blob = URL.createObjectURL(file);
        var element = document.createElement("img");
        element.src = blob;
        element.className = "product-images";
        document.getElementById("images").appendChild(element);
    }
});

// $("#addItems").click(function (ev) {
//     // Add a loading icon while item is uploaded
//     $(".progress-bar").attr("aria-valuenow", "50");
//     $(".progress-bar").css("width", "50");
// });