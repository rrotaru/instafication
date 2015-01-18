var product;
chrome.storage.sync.set({'customer_id':'cus_KAbAoq6_mpiMRk', 'postmates_api_key':'c155af77-5632-4c43-b712-25ef08b855c5'}, function() { console.log('Saved local files!'); });
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
    if (knownStore()) {
        // Or if it fits into some heuristics
        if (!document.body.innerHTML.match(/product/) &&
            !document.body.innerHTML.match(/seller/) &&
            !document.body.innerHTML.match(/[$¢¥£][0-9]/))
                return false;
    }
    return true;
}

// Check if on one of our 'known' sellers
function knownStore() {
    return productmap[document.location.hostname.match(/^.*?\.(.*?)\..*$/)[1]] !== undefined;
}

function getPrice() {
   return document.body.innerText.match(/[$¢¥£]([0-9]+.?[0-9]{2})/)[1];
}

function getName() {
    if (knownStore()) {
        return document.querySelector(productmap[document.location.hostname.match(/^.*?\.(.*?)\..*$/)[1]]).innerText;
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
    var elements = knownStore() ? document.querySelectorAll("div#OneClickBox,input#add-to-cart, button.addtoCart, button.add-to-cart, div.cart-button")
                                : document.querySelectorAll("button[class*='cart'],button[id*='cart'],input[class*='cart'],input[id*='cart'],button[class*='Cart'],button[id*='Cart'],input[class*='Cart'],input[id*='Cart']");
    var theirbutton = elements[0];
    var ourbutton = theirbutton.parentElement.appendChild(document.createElement('button'));
    ourbutton.innerText = "Get Instafication"
    ourbutton.id = "instafication";
    ourbutton.style.height = theirbutton.style.height;
    ourbutton.style.width = theirbutton.clientWidth + 'px';
    ourbutton.addEventListener("click", function(e) { e.stopPropagation(); e.preventDefault(); findLocal(); }, false);
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

function findLocal() {
    var xhr = new XMLHttpRequest();
    var our_api = "https://instafication-api.herokuapp.com/search/";
    var response;

    xhr.open("GET", our_api + encodeURIComponent(product.name), true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            response = JSON.parse(xhr.responseText);
            product.localprice = response.price;
            product.localstore = response.store;
            console.log('found local', product);
            getQuote();
        }
    }
    xhr.send();
}

function getQuote() {
    var xhr = new XMLHttpRequest();
    var postmates_api = "https://api.postmates.com/v1/customers/"
    var params={};
    var response;

    navigator.geolocation.getCurrentPosition(function(loc) {
        params['dropoff_address'] = loc.coords.latitude + "," + loc.coords.longitude;
        params['pickup_address'] = product.localstore + " Philadelphia, PA";
        
        var request = Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]) }).join('&');
        xhr.open("POST", postmates_api+'cus_KAbAoq6_mpiMRk/delivery_quotes', true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Authorization", 'Basic '+btoa('c155af77-5632-4c43-b712-25ef08b855c5:'));
        xhr.addEventListener("progress", updatebar, false);
        xhr.addEventListener("load", finishbar, false);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                response = JSON.parse(xhr.responseText);
                product.quote_id = response.id;
                console.log('got quote', response);
                displayConfirm();
            }
        }
        xhr.send(request);
    });
}

function displayConfirm() {
    $(function() {
        var NewDialog = $('<div id="MenuDialog"><p>You can get this now with Postmates for $99.99!</p></div>');
        NewDialog.dialog({
            modal: true,
            title: "Confirm your delivery",
            show: 'clip',
            hide: 'clip',
            buttons: [
                {text: "Confirm", click: function() {createDelivery(); $(this).dialog("close");}},
                {text: "Cancel", click: function() {$(this).dialog("close");}}
            ]
        });
        NewDialog.dialog("open");
    });
}

function createDelivery() {
    var xhr = new XMLHttpRequest();
    var postmates_api = "https://api.postmates.com/v1/customers/";
    var params={};
    var response;

    navigator.geolocation.getCurrentPosition(function(loc) { 
        params['manifest'] = product.name;
        params['pickup_name'] = product.localstore;
        params['pickup_address'] = product.localstore + " Philadelphia, PA";
        params['pickup_phone_number'] = '123-456-7890';
        params['pickup_business_name'] = product.localstore;
        params['pickup_notes'] = 'Ordered using Instafication. Pick up at front desk';
        params['dropoff_name'] = 'Me';
        params['dropoff_address'] = loc.coords.latitude + "," + loc.coords.longitude;
        params['dropoff_phone_number'] = '098-654-7321';
        params['dropoff_business_name'] = 'me';
        params['dropoff_notes'] = 'Leave it here.';
        params['quote_id'] = product.quote_id;

        var request = Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]) }).join('&');
        xhr.open("POST", postmates_api+'cus_KAbAoq6_mpiMRk/deliveries', true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Authorization", 'Basic '+btoa('c155af77-5632-4c43-b712-25ef08b855c5:'));

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                response = JSON.parse(xhr.responseText);
                console.log('created delivery', response);
            }
        }
        xhr.send(request);
    });
}

function updatebar(e) {
    $("body").progressbar(e.loaded / e.total);
}

function finishbar(e) {
    $("body").progressbar(e.total);
}

(function() {
  $(document).ready(function() {
    var runProgressBar;
    runProgressBar = function() {
      var i, interval,
        _this = this;
      i = 0;
      clearInterval(interval);
      return interval = setInterval(function() {
        if (i > 10) {
          i = 0;
          clearInterval(interval);
        }
        $("body").progressbar(i * 10);
        return i++;
      }, 500);
    };
    return window.runProgressBar = runProgressBar;
  });
 
}).call(this);

