const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/babies", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    required:true
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
  picture: String
});

const Item = new mongoose.model("Item", itemSchema);

var one = new Item({
  name: "shirt",
  itemType: "Clothing",
  manufacturer: "hanes",
  price: 4,
  city: "Charlotte",
  state: "NC",
  picture: "imageofshirt.png"
});
one.save();

var one = new Item({
  name: "pant",
  itemType: "Clothing",
  manufacturer: "levi",
  price: 6,
  city: "New York",
  state: "NY",
  picture: "imageofpants.png"
});
one.save();

var one = new Item({
  name: "hot wheels car",
  itemType: "Toy",
  manufacturer: "Hot Wheels",
  price: 2.00,
  city: "Austin",
  state: "TX",
  picture: "imageofcar.png"
});
one.save();

var one = new Item({
  name: "doll",
  itemType: "Toy",
  manufacturer: "barbie",
  price: 3.50,
  city: "Charlotte",
  state: "NC",
  picture: "imageofdoll.png"
});
one.save();

var one = new Item({
  name: "high chair",
  itemType: "Furniture",
  manufacturer: "",
  price: 30.00,
  city: "Rock Hill",
  state: "SC",
  picture: "imageofhighchair.png"
});
one.save();

var one = new Item({
  name: "crib",
  itemType: "Furniture",
  manufacturer: "",
  price: 65,
  city: "Boone",
  state: "NC",
  picture: "imageofcrib.png"
});
one.save();

var one = new Item({
  name: "stroller x56",
  itemType: "Strollers",
  manufacturer: "stroller co",
  price: 195.00,
  city: "Wilmington",
  state: "NC",
  picture: "imageofstroller.png"
});
one.save();

var one = new Item({
  name: "str00ll mk5",
  itemType: "Stroller",
  manufacturer: "",
  price: 1000.00,
  city: "Seattle",
  state: "WA",
  picture: "imageofsttr00l.png"
});
one.save();
console.log("done");
