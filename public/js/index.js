// Open/Close login box
function openLogin() {
  $('#login').fadeIn(200);
}

function closeLogin() {
  $('#login').fadeOut(100);
}

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}

function setMainImage(img) {
  var src = img.src;
  $(".displayed-image").attr("src", src);
  $(".tiny-images").attr("class", "tiny-images");
  $(img).attr("class", "tiny-images selected-image");
}

function removeImage(div) {
  div.parentNode.remove();
}

function toggleAddAddress() {
  var display = $(".address-form").css("display");
  if (display === "none") {
    $(".address-form").show();
  } else {
    $(".address-form").hide();
  }
}