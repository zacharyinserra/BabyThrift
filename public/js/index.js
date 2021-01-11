var sources = [];


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
  var src = div.parentNode.children[0].src;
  src = src.substring(src.lastIndexOf("/") + 1);
  sources.push(src);
  $("#sourcesToRemove").val(sources.join(";"));
  div.parentNode.remove();
}

$(document).mouseup(function (e) {
  var container = $(".payment-method-form");
  // if the target of the click isn't the container nor a descendant of the container
  if (!container.is(e.target) && container.has(e.target).length === 0) {
    container.hide();
    $("body").css("background-color", "rgb(255,255,255)");
    $(".setting-blocks").css("box-shadow", "0 0 50px #bcdad8");
  }
});

function closeForm(form) {
  form.parent().hide();
  $("body").css("background-color", "rgb(255,255,255)");
  $(".setting-blocks").css("box-shadow", "0 0 50px #bcdad8");
}

function toggleAddAddress() {
  var display = $(".address-form").css("display");
  if (display === "none") {
    $(".address-form").show();
  } else {
    $(".address-form").hide();
  }
}

function openAddPaymentMethod() {
  var display = $(".payment-method-form").css("display");
  if (display === "none") {
    $("body").css("background-color", "rgba(0,0,0,0.5)");
    $(".setting-blocks").css("box-shadow", "none");
    $(".payment-method-form").show();
  }
}

function closeAddPaymentMethod() {
  $("body").css("background-color", "rgb(255,255,255)");
  $(".setting-blocks").css("box-shadow", "0 0 50px #bcdad8");
  $(".payment-method-form").hide();
}