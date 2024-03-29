//nodemon app.js --signal SIGKILL -e js,html,ejs,css

//jshint esversion:6

require('dotenv').config();

const fs = require("fs");
const express = require("express");
const session = require("express-session");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongo = require("mongodb");
const ObjectId = require('mongodb').ObjectID;
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const AWS = require('aws-sdk');
const multer = require('multer');

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.json({
  type: ["application/json", "text/plain"]
}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// Constants
var userID = "";
var isGoogleAuth = null;
var gPageLimit = 4;


// multer

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "C:/Code/BabyThrift/tmp-images") //switch to dirname
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + ".png")
  }
})
const upload = multer({
  storage: storage
});


// User Schema

mongoose.connect("mongodb://localhost:27017/babies", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  fullname: String,
  username: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


// Item Schema

const itemSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    required: true
  },
  condition: {
    type: String,
    required: true
  },
  manufacturer: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  picture: String,
  views: {
    type: Number,
    default: 0
  }
});

const Item = new mongoose.model("Item", itemSchema);


// Address Schema

const addressSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  fullname: {
    type: String,
    required: true
  },
  address1: {
    type: String,
    required: true
  },
  address2: {
    type: String
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zip: {
    type: Number,
    required: true
  }
});

const Address = new mongoose.model("Address", addressSchema);


// Payment Schema
const paymentSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  fullname: {
    type: String,
    required: true
  },
  cardNumber: {
    type: String,
    required: true
  },
  expirationDate: {
    type: String,
    required: true
  },
  zip: {
    type: Number,
    required: true
  }
});

const Payment = new mongoose.model("Payment", paymentSchema);


// Wishlist Schema
const wishlistSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  itemID: {
    type: String,
    required: true
  }
});

const Wishlist = new mongoose.model("Wishlist", wishlistSchema);


// AWS S3

const bucketName = process.env.BUCKETNAME;
const bucketRegion = process.env.BUCKETREGION;
const IdentityPoolId = process.env.IDENTITY_POOL_ID;

AWS.config = new AWS.Config();
AWS.config.accessKeyId = process.env.ACCESSKEY;
AWS.config.secretAccessKey = process.env.SECRETKEY;
AWS.config.region = "us-east-2";

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: {
    Bucket: bucketName
  }
});


// Google Passport

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


// Google auth route

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/authentication",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function (accessToken, refreshToken, profile, cb) {
    // Is google authentication
    User.findOrCreate({
      googleId: profile.id
    }, function (err, user) {
      isGoogleAuth = true;
      userID = user._id;
      return cb(err, user);
    });
  }
));


// API routes

app.get("/", function (req, res) {
  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    Item.find({}, function (err, items) {
      if (err) {
        console.log(err);
        reject();
      } else {
        resolve();
      }
    });
  });
  promise.then(function (result) {
      res.render("home", {
        check: isAuth(req),
        itemList: itemsToRender
      });
    },
    function (err) {
      console.log(err);
    });
});

app.get("/register", function (req, res) {
  res.render("register", {
    check: false
  });
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

app.get("/auth/google/authentication",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function (req, res) {
    res.redirect("/");
  });

app.get("/logout", function (req, res) {
  isGoogleAuth = null;
  userID = "";
  req.logout();
  res.redirect("/");
});

app.get("/account", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var itemsToRender = [];
  // Retreive items from database for specific user based on their ID
  var promise = new Promise(function (resolve, reject) {
    Item.find({
      userID: userID
    }, function (err, items) {
      if (err) {
        console.log(err);
      } else {
        itemsToRender = items;
        if (itemsToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });
  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("account", {
          check: true,
          itemList: itemsToRender
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("account", {
          check: true,
          itemList: itemsToRender
        });
      } else {
        res.render("login");
      }
    });
});

app.get("/item-upload", function (req, res) {
  if (isAuth(req)) {
    res.render("item-upload", {
      check: true
    });
  } else {
    res.render("login");
  }
});

app.get("/search-results/:itemType", function (req, res) {

  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    Item.find({
      itemType: req.params.itemType
    }, function (err, items) {
      if (err) {
        console.log("Error: /search-results/:itemType - " + err);
      } else {
        itemsToRender = items;
        if (itemsToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    }).limit(gPageLimit);
  });
  promise.then(function (result) {
      res.render("search-results", {
        check: isAuth(req),
        placeholder: "",
        itemType: req.params.itemType,
        itemList: itemsToRender,
        pageNum: 1,
        pageLimit: gPageLimit,
        sortCriteria: ""
      });
    },
    function (err) {
      console.log("Error (promise): /search-results/:itemType - " + err);
    });
});

app.get("/item/:itemID", function (req, res) {
  var id = req.params.itemID;
  var name;
  var desc;
  var manufacturer;
  var condition;
  var price;
  var city;
  var state;
  var pics;
  var views;

  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: id
    }, function (err, item) {
      name = item.name;
      desc = item.description;
      manufacturer = item.manufacturer;
      condition = item.condition;
      price = item.price;
      city = item.city;
      state = item.state;
      pics = item.picture;
      views = item.views;
      if (err) {
        console.log(err);
      } else {
        if (item) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {

      var promise = new Promise(function (resolve, reject) {
        Item.updateOne({
          _id: req.params.itemID
        }, {
          $set: {
            views: views + 1
          }
        }, function (err, res) {
          if (err) {
            console.log(err);
            reject();
          } else {
            resolve();
          }
        });
      });
      promise.then(function (result) {
          console.log("Views incremented");
        },
        function (err) {
          console.log(err);
        });

      pics = pics.split(";");
      res.render("item", {
        check: isAuth(req),
        itemID: id,
        itemName: name,
        itemDesc: desc,
        itemManu: manufacturer,
        itemCondition: condition,
        itemPrice: price,
        itemCity: city,
        itemState: state,
        itemPics: pics,
        itemViews: views + 1
      });
    },
    function (err) {
      console.log(err);
    });
});

app.get("/edit-item/:itemID", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var name;
  var desc;
  var type;
  var manufacturer;
  var condition;
  var price;
  var city;
  var state;
  var pics;

  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: req.params.itemID
    }, function (err, item) {
      name = item.name;
      desc = item.description;
      type = item.itemType;
      manufacturer = item.manufacturer;
      condition = item.condition;
      price = item.price;
      city = item.city;
      state = item.state;
      pics = item.picture;
      if (err) {
        console.log(err);
      } else {
        if (item) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      pics = pics.split(";");
      res.render("edit-item", {
        check: isAuth(req),
        itemID: req.params.itemID,
        itemName: name,
        itemDesc: desc,
        itemType: type,
        itemManu: manufacturer,
        itemCondition: condition,
        itemPrice: price,
        itemCity: city,
        itemState: state,
        itemPics: pics
      });
    },
    function (err) {
      console.log(err);
    });
});

app.get("/account-settings", function (req, res) {
  if (isAuth(req)) {
    res.render("account-settings", {
      check: true
    });
  } else {
    res.render("login");
  }
});

app.get("/account-settings/addresses", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var addressesToRender = [];

  var promise = new Promise(function (resolve, reject) {
    Address.find({
      userID: userID
    }, function (err, addresses) {
      if (err) {
        console.log(err);
      } else {
        addressesToRender = addresses;
        if (addressesToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("addresses", {
          check: true,
          addressList: addressesToRender
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("addresses", {
          check: true,
          addressList: addressesToRender
        });
      } else {
        res.render("login");
      }
    });
});

app.get("/account-settings/payment-methods", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var paymentMethodsToRender = [];

  var promise = new Promise(function (resolve, reject) {
    Payment.find({
      userID: userID
    }, function (err, payments) {
      if (err) {
        console.log(err);
      } else {
        paymentMethodsToRender = payments;
        if (paymentMethodsToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("payment-methods", {
          check: true,
          paymentList: paymentMethodsToRender
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("payment-methods", {
          check: true,
          paymentList: paymentMethodsToRender
        });
      } else {
        res.render("login");
      }
    });
});

app.get("/account-settings/notification-preferences", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  res.render("notification-preferences", {
    check: isAuth(req)
  });
});

app.get("/account-settings/delete-account", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  res.render("delete-account", {
    check: isAuth(req)
  });
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/user-items", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    Item.find({
      userID: userID
    }, function (err, items) {
      if (err) {
        console.log(err);
      } else {
        itemsToRender = items;
        if (itemsToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    }).limit(gPageLimit);
  });
  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("user-items", {
          check: true,
          itemList: itemsToRender,
          pageLimit: 4,
          pageNum: 1,
          sortCriteria: ""
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("user-items", {
          check: true,
          itemList: itemsToRender,
          pageLimit: 4,
          pageNum: 1,
          sortCriteria: ""
        });
      } else {
        res.render("login");
      }
    });
});

app.get("/edit-address/:addressID", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var id = req.params.addressID;
  var userID;
  var fullname;
  var address1;
  var address2;
  var city;
  var state;
  var zip;

  var promise = new Promise(function (resolve, reject) {
    Address.findOne({
        _id: id
      },
      function (err, address) {
        userID = address.userID;
        fullname = address.fullname;
        address1 = address.address1;
        address2 = address.address2;
        city = address.city;
        state = address.state;
        zip = address.zip;
        if (err) {
          console.log("Error: /edit-address/:addressID - " + err);
          reject();
        } else {
          resolve();
        }
      });
  });

  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("edit-address", {
          check: true,
          id: id,
          userID: userID,
          fullname: fullname,
          address1: address1,
          address2: address2,
          city: city,
          state: state,
          zip: zip
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log("Error (promise): /edit-address/:addressID - " + err);
      res.render("error");
    });
});

app.get("/edit-payment/:paymentID", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var id = req.params.paymentID;
  var userID;
  var fullname;
  var cardNumber;
  var expDate;
  var expMonth;
  var expYear;
  var zip;

  var promise = new Promise(function (resolve, reject) {
    Payment.findOne({
        _id: id
      },
      function (err, payment) {
        userID = payment.userID;
        fullname = payment.fullname;
        cardNumber = payment.cardNumber;
        expDate = payment.expirationDate;
        zip = payment.zip;

        expMonth = expDate.split("/")[0];
        expYear = expDate.split("/")[1];

        if (err) {
          console.log("Error: /edit-payment/:paymentID - " + err);
          reject();
        } else {
          resolve();
        }
      });
  });

  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("edit-payment", {
          check: true,
          id: id,
          userID: userID,
          fullname: fullname,
          cardNumber: cardNumber,
          expMonth: expMonth,
          expYear: expYear,
          zip: zip
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log("Error (promise): /edit-payment/:paymentID - " + err);
      res.render("error");
    });
});

app.get("/cart", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  res.render("cart", {
    check: isAuth(req),
    cartImage: "009c957d-2d41-4c00-a4af-282288391d3d.png",
    itemName: "Test holder item name",
    itemPrice: "$39.99",
    subTotal: "$79.98"
  });
});

app.post("/register", function (req, res) {
  User.register({
    fullname: req.body.fullname,
    username: req.body.username
  }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.post("/login", function (req, res) {

  var url = req.headers.referer;

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        // Not google authentication
        isGoogleAuth = false;
        userID = req.user._id;
        res.redirect(url);
      });
    }
  });
});

app.post("/database-add", upload.array("itemImages"), function (req, res) {

  if (!(isAuth(req))) {
    res.redirect("/login");
  }

  var name = req.body.nameOfItem;
  var desc = req.body.descriptionOfItem;
  var type = req.body.typeOfItem;
  var condition = req.body.conditionOfItem;
  var manufacturer = req.body.manufacturerOfItem;
  var price = req.body.priceOfItem;
  var city = req.body.cityOfItem;
  var state = req.body.stateOfItem;

  // Upload image files to s3 bucket

  var files = fs.readdirSync(__dirname + "/tmp-images");
  // console.log(files);

  var promises = [];

  files.forEach(item => {
    var fileContent = fs.readFileSync(__dirname + "/tmp-images/" + item);

    var params = {
      Bucket: bucketName,
      Key: "item-images/" + item,
      ACL: "public-read",
      Body: fileContent
    };

    promises.push(
      new Promise(function (resolve, reject) {
        s3.upload(params, function (err, data) {
          if (err) {
            console.log(err);
            reject();
          } else {
            console.log("File uploaded successfully. ${data.Location}");
            resolve();
          }
        })
      })
      .then(function (result) {}).catch(function (err) {
        console.log(err);
        res.render("upload-error", {
          check: true,
          error: err
        });
      })
    )
  });

  // Waits till all files uploaded
  Promise.all(promises).then(() => {
    console.log("Upload complete.");

    // Delete temp image files
    files.forEach(item => {
      fs.unlink(__dirname + "/tmp-images/" + item, err => {
        if (err) {
          console.log(err);
        }
      });
    });
    console.log("Temp files deleted.");

    // Do database add of item as long as everything works

    var dbItem = new Item({
      userID: userID,
      name: name,
      description: desc,
      itemType: type,
      condition: condition,
      manufacturer: manufacturer,
      price: price,
      city: city,
      state: state,
      picture: files.join(";")
    });
    dbItem.save(function (err, doc) {
      if (err) {
        console.log(err);
        res.render("upload-error", {
          check: true,
          error: err
        });
      } else {
        console.log("Item added succesfully");
        res.render("upload-success", {
          check: true,
          itemID: dbItem._id,
          itemName: name,
          itemDesc: desc,
          itemType: type,
          itemCondition: condition,
          itemManu: manufacturer,
          itemPrice: price,
          itemCity: city,
          itemState: state,
          itemPics: files
        });
      }
    });
  });
});

app.post("/edit-item/database-edit", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  console.log("Begin edit");
  var id = req.body.itemID;
  var name = req.body.nameOfItem;
  var desc = req.body.descriptionOfItem;
  var type = req.body.typeOfItem;
  var manufacturer = req.body.manufacturerOfItem;
  var condition = req.body.conditionOfItem;
  var price = req.body.priceOfItem;
  var city = req.body.cityOfItem;
  var state = req.body.stateOfItem;
  var removedImages = req.body.sourcesToRemove.split(";");
  var pics;
  var difference;

  // Find current item pictures
  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: ObjectId(id)
    }, function (err, item) {
      pics = item.picture;
      if (err) {
        reject(err);
      } else {
        resolve(item);
      }
    });
  });
  promise.then(function (result) {
      console.log("Current pictures found");
      console.log("Getting images to remove from S3 bucket");
      // Get difference of removed pics and current pics
      difference = pics.split(";").filter(x => !removedImages.includes(x));

      // Update item in DB
      var filter = {
        _id: ObjectId(id)
      };
      var update = {
        $set: {
          name: name,
          description: desc,
          itemType: type,
          manufacturer: manufacturer,
          condition: condition,
          price: price,
          city: city,
          state: state,
          picture: difference.join(";")
        },
      };

      var innerPromise = new Promise(function (resolve, reject) {
        Item.updateOne(filter, update, function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
      innerPromise.then(function (result) {
          console.log("Item updated.");
          console.log(result);
        },
        function (err) {
          console.log(err);
        });

      // Remove pics from S3 bucket
      removedImages.forEach(pic => {
        var params = {
          Bucket: bucketName,
          Key: "item-images/" + pic,
        };
        var p = new Promise(function (resolve, reject) {
          s3.deleteObject(params, function (err, data) {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
        p.then(function (data) {
            console.log("File deleted from S3 bucket successfully - " + pic);
            // Find and render item
            var promise = new Promise(function (resolve, reject) {
              Item.findOne({
                _id: ObjectId(id)
              }, function (err, item) {
                name = item.name;
                desc = item.description;
                manufacturer = item.manufacturer;
                condition = item.condition;
                price = item.price;
                city = item.city;
                state = item.state;
                pics = item.picture;
                if (err) {
                  console.log(err);
                } else {
                  if (item) {
                    resolve();
                  } else {
                    reject();
                  }
                }
              });
            });
            promise.then(function (result) {
                pics = pics.split(";");
                res.render("edit-success", {
                  check: isAuth(req),
                  itemID: id,
                  itemName: name,
                  itemDesc: desc,
                  itemManu: manufacturer,
                  itemCondition: condition,
                  itemPrice: price,
                  itemCity: city,
                  itemState: state,
                  itemPics: pics
                });
              },
              function (err) {
                console.log(err);
                //render error page
                res.render("edit-error");
              });
          },
          function (err) {
            //render error page
            console.log("Error occurred deleting pictures from S3 bucket - " + err);
          });
      });
    },
    function (err) {
      //render error page
      console.log("Error occured retrieving current item pictures - " + err);
    });
});

app.post("/edit-address/address-edit", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  console.log("Begin address edit");
  var id = req.body.addressID;
  var fullname = req.body.fullname;
  var address1 = req.body.address1;
  var address2 = req.body.address2;
  var city = req.body.city;
  var state = req.body.state;
  var zip = req.body.zipcode;

  var filter = {
    _id: id
  };
  var update = {
    $set: {
      fullname: fullname,
      address1: address1,
      address2: address2,
      city: city,
      state: state,
      zip: zip
    },
  };

  var promise = new Promise(function (resolve, reject) {
    Address.updateOne(filter, update, function (err, res) {
      if (err) {
        console.log(err);
        reject();
      } else {
        resolve();
      }
    });
  });
  promise.then(function (result) {
      if (isAuth(req)) {
        res.redirect("/account-settings");
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("error", {
          check: true
        });
      } else {
        res.render("login");
      }
    });
});

app.post("/edit-payment/payment-edit", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  console.log("Begin edit payment method");
  var id = req.body.paymentID;
  var fullname = req.body.fullname;
  var cardNumber = req.body.cardNumber;
  var expDate;
  var expMonth = req.body.expMonth;
  var expYear = req.body.expYear;
  var zipcode = req.body.zipcode;

  var filter = {
    _id: id
  };
  var update = {
    $set: {
      fullname: fullname,
      cardNumber: cardNumber,
      expirationDate: expMonth + "/" + expYear,
      zip: zipcode
    },
  };

  var promise = new Promise(function (resolve, reject) {
    Payment.updateOne(filter, update, function (err, res) {
      if (err) {
        console.log(err);
        reject();
      } else {
        resolve();
      }
    });
  });
  promise.then(function (result) {
      if (isAuth(req)) {
        res.redirect("/account-settings");
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("error", {
          check: true
        });
      } else {
        res.render("login");
      }
    });
});

app.post("/search-results/:itemType?", function (req, res) {
  var search = req.body.searchText;
  var category = req.body.category;

  if (category === "All") {
    category = ""
  }

  if (req.params.itemType) {
    category = req.params.itemType;
  }

  var limit = parseInt(req.body.pageLimit);
  var page = parseInt(req.body.pageNumber);
  var next = req.body.next;
  var previous = req.body.previous;
  var sortCriteria = req.body.sortCriteria;
  var sort = {};

  switch (sortCriteria) {
    case "Featured":
      //
      break;
    case "Price: High to Low":
      sort = {
        price: -1
      };
      break;
    case "Price: Low to High":
      sort = {
        price: 1
      };
      break;
    case "Closest":
      // Have to add some way of checking distance
      break;
    case "Farthest":
      //
      break;
    case "Condition: High to Low":
      sort = {
        condition: -1
      };
      break;
    case "Condition: Low to High":
      sort = {
        condition: 1
      };
      break;
    default:
      sort = {};
      break;
  }

  if (limit == null || isNaN(limit)) {
    limit = gPageLimit;
  }
  if (page == null || isNaN(page)) {
    page = 0;
  } else {
    page = page - 1;
  }

  if (next === "") {
    page = page + 1;
  }
  if (previous === "") {
    if (page >= 1) {
      page = page - 1;
    }
  }

  var skip = page * limit;

  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    // db.getCollection('items').find({"name":{$regex:".*test.*", $options: "i"}, "itemType":{$regex: ".*Clothing.*"}})
    Item.find({
      name: {
        $regex: ".*" + search + ".*",
        $options: "i"
      },
      itemType: {
        $regex: ".*" + category + ".*"
      }
    }, function (err, items) {
      if (err) {
        console.log("Error: /search-results - " + err);
        reject();
      } else {
        console.log(items);
        itemsToRender = items;
        resolve();
      }
    }).limit(limit).skip(skip).sort(sort);
  });
  promise.then(function (result) {
    res.render("search-results", {
      check: isAuth(req),
      itemList: itemsToRender,
      itemType: category,
      pageNum: page + 1,
      pageLimit: limit,
      placeholder: search,
      category: category,
      sortCriteria: sortCriteria
    });
  }).catch((err) => {
    console.log("Error (promise): /search-results - " + err);
  });
});

app.post("/edit-item/delete-item", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var id = req.body.itemID;
  var name;
  var desc;
  var manufacturer;
  var price;
  var city;
  var state;
  var pics;

  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: id
    }, function (err, item) {
      name = item.name;
      desc = item.description;
      manufacturer = item.manufacturer;
      price = item.price;
      city = item.city;
      state = item.state;
      pics = item.picture;
      if (err) {
        console.log(err);
      } else {
        if (item) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      console.log("Item found.");
      console.log(result);
    },
    function (err) {
      console.log(err);
    });

  console.log("Begin delete.");
  var promise = new Promise(function (resolve, reject) {
    Item.deleteOne({
      _id: id
    }, function (err) {
      if (err) {
        console.log(err);
        reject();
      } else {
        resolve();
      }
    });
  });

  promise.then(function (result) {
      pics = pics.split(";");
      console.log(result);
      res.render("delete-success", {
        check: isAuth(req),
        itemID: id,
        itemName: name,
        itemDesc: desc,
        itemManu: manufacturer,
        itemPrice: price,
        itemCity: city,
        itemState: state,
        itemPics: pics
      });
    },
    function (err) {
      console.log(err);
      res.render("delete-error");
    });
});

app.post("/account-settings/address-add", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }
  console.log(req.body);
  var fullname = req.body.fullname;
  var address1 = req.body.address1;
  var address2 = req.body.address2;
  var city = req.body.city;
  var state = req.body.state;
  var zipcode = req.body.zipcode;

  var address = new Address({
    userID: userID,
    fullname: fullname,
    address1: address1,
    address2: address2,
    city: city,
    state: state,
    zip: zipcode
  });

  address.save(function (err, doc) {
    if (err) {
      console.log(err);
      res.render("upload-error", {
        check: true,
        error: err
      });
    } else {
      console.log("Address added succesfully");
      res.redirect("/account-settings/addresses");
    }
  });
});

app.post("/account-settings/delete-address", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var id = req.body.addressID;

  var promise = new Promise(function (resolve, reject) {
    Address.deleteOne({
      _id: id
    }, function (err) {
      if (err) {
        console.log(err);
        reject();
      } else {
        resolve();
      }
    });
  });

  promise.then(function (result) {
      res.redirect("/account-settings/addresses");
    },
    function (err) {
      console.log(err);
      res.render("delete-error");
    });
});

app.post("/account-settings/payment-add", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var fullname = req.body.fullname;
  var cardNumber = req.body.cardNumber;
  var expDate;
  var expMonth = req.body.expMonth;
  var expYear = req.body.expYear;
  var zipcode = req.body.zipcode;

  var payment = new Payment({
    userID: userID,
    fullname: fullname,
    cardNumber: cardNumber,
    expirationDate: expMonth + "/" + expYear,
    zip: zipcode
  });

  payment.save(function (err, doc) {
    if (err) {
      console.log(err);
      res.render("upload-error", {
        check: true,
        error: err
      });
    } else {
      console.log("Payment method added succesfully - " + doc);
      res.redirect("/account-settings/payment-methods");
    }
  });
});

app.post("/user-items", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var limit = parseInt(req.body.pageLimit);
  var page = parseInt(req.body.pageNumber);
  var next = req.body.next;
  var previous = req.body.previous;
  var sortCriteria = req.body.sortCriteria;
  var sort = {};

  switch (sortCriteria) {
    case "Featured":
      //
      break;
    case "Price: High to Low":
      sort = {
        price: -1
      };
      break;
    case "Price: Low to High":
      sort = {
        price: 1
      };
      break;
    case "Closest":
      // Have to add some way of checking distance
      break;
    case "Farthest":
      //
      break;
    case "Condition: High to Low":
      sort = {
        condition: -1
      };
      break;
    case "Condition: Low to High":
      sort = {
        condition: 1
      };
      break;
    default:
      sort = {};
      break;
  }

  if (limit == null || isNaN(limit)) {
    limit = gPageLimit;
  }
  if (page == null || isNaN(page)) {
    page = 0;
  } else {
    page = page - 1;
  }

  if (next === "") {
    page = page + 1;
  }
  if (previous === "") {
    if (page >= 1) {
      page = page - 1;
    }
  }

  var skip = page * limit;

  var itemsToRender = [];

  var promise = new Promise(function (resolve, reject) {
    Item.find({
      userID: userID
    }, function (err, items) {
      if (err) {
        console.log(err);
      } else {
        itemsToRender = items;
        if (itemsToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    }).limit(limit).skip(skip).sort(sort);
  });
  promise.then(function (result) {
      if (isAuth(req)) {
        res.render("user-items", {
          check: true,
          itemList: itemsToRender,
          pageLimit: limit,
          pageNum: page + 1,
          sortCriteria: sortCriteria
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("user-items", {
          check: true,
          itemList: itemsToRender,
          pageLimit: limit,
          pageNum: page + 1,
          sortCriteria: sortCriteria
        });
      } else {
        res.render("login");
      }
    });
});

app.post("/account-settings/delete-account", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var promise = new Promise(function (resolve, reject) {

    // Delete all items
    Item.deleteMany({
      userID: userID
    }, function (err, result) {
      if (err) {
        console.log(err);
        reject();
      } else {
        console.log(result);
      }
    });

    // Delete all addresses
    Address.deleteMany({
      userID: userID
    }, function (err, result) {
      if (err) {
        console.log(err);
        reject();
      } else {
        console.log(result);
      }
    });

    // Delete all payment methods
    Payment.deleteMany({
      userID: userID
    }, function (err, result) {
      if (err) {
        console.log(err);
        reject();
      } else {
        console.log(result);
      }
    });

    // Delete user
    User.deleteOne({
      _id: userID
    }, function (err, result) {
      if (err) {
        console.log(err);
        reject();
      } else {
        console.log(result);
        resolve();
      }
    });
  });

  promise.then(function (result) {
    console.log(result);
    res.render("");
  }, function (err) {
    console.log(err);
    res.render("");
  });
});

app.post("/item/wishlist-add/:itemID", function (req, res) {

  if (!(isAuth(req))) {
    res.render("login");
  }

  var itemID = req.params.itemID;

  var wishlistItem = new Wishlist({
    userID: userID,
    itemID: itemID
  });

  wishlistItem.save(function (err, doc) {
    if (err) {
      console.log(err);
      res.render("upload-error", {
        check: true,
        error: err
      });
    } else {
      console.log("Item added to wishlist - " + doc);
      res.redirect("back");
    }
  });

});

function isAuth(req) {
  var check;
  if (req.isAuthenticated()) {
    check = true;
  } else {
    check = false;
  }
  return check;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function dbFindOne(collection, query) {
  return new Promise((resolve, reject) => {
    collection.findOne(query, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    })
  })
}

app.listen(3000, function () {
  console.log("Server running on port 3000...");
});