chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);

		// ----------------------------------------------------------
		// This part of the script triggers when page is done loading
        console.log("%cInstafication loaded", "font-size:24px;");
		// ----------------------------------------------------------


        /* Check if there is a product on the page */
        if (hasproduct()) {
            product = new Product(getName(), getPrice());
            showButton();
        }

	}
	}, 10);
});

function hasproduct() { 
    // Check if on one of our 'known' sellers
    var store = document.location.hostname.match(/^.*?\.(.*?)\..*$/);
    if (typeof productmap[store] === undefined) {
        // Or if it fits into some heuristics
        if (!document.body.innerHTML.match(/product/) &&
            !document.body.innerHTML.match(/seller/) &&
            !document.body.innerHTML.match(/[$¢¥£][0-9]/))
                return false;
    }
    return true;
}

function getPrice() {
   return document.body.innerText.match(/[$¢¥£]([0-9]+.?[0-9]{2})/)[1];
}

function getName() {
    // Check if on one of our 'known' sellers
    var store = document.location.hostname.match(/^.*?\.(.*?)\..*$/)[1];
    if (typeof productmap[store] !== undefined) {
        return document.querySelector(productmap[store]).innerText;
    }

    // array of possible product names
    var possible = [];

    // otherwise fallback to some heuristics..
    possible.concat(getStrings(document.querySelectorAll("[id*='product']")));
    possible.concat(getStrings(document.querySelectorAll("[class*='product']")));
    possible.filter(function(text) { return text.lastIndexOf("\n") == -1 });
    return possible[0];
}

// Given a list of element nodes, returns those with innerText
function getStrings(nodeList) {
    var array = [];
    for (i = 0; i < nodeList.length; i++) {
        var text = nodeList[i].innerText.trim();
        if (text !== "") {
            array.push(text);
        }
    }
    return array;
}

function showButton() {
    // append a magical button next to the checkout or buy button
    /*var elements = document.querySelectorAll("[class*='cart'] button,[id*='cart'] button,[class*='cart'] input,[id*='cart'] input")[0]
    var ourbutton = theirbutton.parentElement.appendChild(document.createElement('button'));
    ourbutton.innerText = "Get Instafication"
    ourbutton.id = "instafication";
    ourbutton.style.height = theirbutton.style.height;
    ourbutton.style.width = theirbutton.style.width;*/
}

var productmap = {
    "amazon"          : "#productTitle",
    "walmart"         : ".product-name",
    "target"          : ".product-name>span",
    "barnesandnoble"  : "#product-title-1>h1",
    "sportsauthority" : "h1",
    "bestbuy"         : "#sku-title>h1"
}

var Product = (function() {
    function Product(name, price) {
        if (typeof name !== undefined) this.name = name;
        if (typeof price !== undefined) this.price = price;
    }

    Product.prototype.someFunction = function() {}

    return Product;
})();
