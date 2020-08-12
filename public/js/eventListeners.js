$("#image-file").change(function (ev) {

    document.getElementById("images").style.display = "block";

    for (i = 0; i < this.files.length; i++) {
        var file = this.files[i];
        // console.log(URL.createObjectURL(file));
        var element = document.createElement("img");
        element.src = URL.createObjectURL(file);
        element.className = "product-images";
        document.getElementById("images").appendChild(element);
        // var element = (
        //     <div>
        //       <img src={file}></img>
        //     </div>
        //   );
        //   ReactDOM.render(element, document.getElementById("images"));
    }
});