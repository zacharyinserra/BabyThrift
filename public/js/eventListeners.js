$("#image-file").change(function (ev) {

    
    while (document.getElementById("images").firstChild) {
        document.getElementById("images").removeChild(document.getElementById("images").firstChild);
    }

    document.getElementById("images").style.display = "block";

    for (i = 0; i < this.files.length; i++) {
        element = document.createElement("div");
        element.className = "image-remove-overlay";
        document.getElementById("images").appendChild(element);

        var file = this.files[i];
        var blob = URL.createObjectURL(file);
        var element = document.createElement("img");
        element.src = blob;
        element.className = "product-images";
        document.getElementsByClassName("image-remove-overlay")[i].appendChild(element);

        element = document.createElement("button");
        element.className = "btn-image-delete";
        element.textContent = "Remove"
        element.onclick = function() { removeImage(this) };
        document.getElementsByClassName("image-remove-overlay")[i].appendChild(element);
    }
});

// $("#addItems").click(function (ev) {
//     // Add a loading icon while item is uploaded
//     $(".progress-bar").attr("aria-valuenow", "50");
//     $(".progress-bar").css("width", "50");
// });