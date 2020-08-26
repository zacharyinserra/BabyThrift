
// var imgURLs = "";
// var apiURLs = "";

$("#image-file").change(function (ev) {

    document.getElementById("images").style.display = "block";

    // files = this.files;

    for (i = 0; i < this.files.length; i++) {
        var file = this.files[i];
        var blob = URL.createObjectURL(file);
        var element = document.createElement("img");
        element.src = blob;
        element.className = "product-images";
        document.getElementById("images").appendChild(element);
        // imgURLs += blob + ";";

        // var path = "/testFolder/" + file.name;
        // var type = file.type;

        // var apiURL = "/upload?path=" + path + "&type=" + type;

        // apiURLs += apiURL + ";";
    }
});

// $("#addItems").click(function (ev) {
//     var name = $("#name").text();
//     var manufacturer = $("manufacturer").text();
//     var price = $("price").text();
//     var city = $("#city").text();
//     var state = $("#state option:selected").text();

//     // if (name === "" || imgURLs === "" || price === "" || city === "" || state === "") {
//     //     alert("One or more required fields has been left empty");
//     //     return;
//     // }

//     var itemToAdd = JSON.stringify({
//         "name": name,
//         "imgs": apiURLs,
//         "manufacturer": manufacturer,
//         "price": price,
//         "city": city,
//         "state": state
//     });

//     fetch('/databaseAdd', {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: itemToAdd
//     });
// });