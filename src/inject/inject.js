var product, deliveries;
var postmates_api = "https://api.postmates.com/v1/customers/";
var our_api = "https://instafication-api.herokuapp.com/search/";
var customer_id = "cus_KAbAoq6_mpiMRk";
var api_b64 = btoa('c155af77-5632-4c43-b712-25ef08b855c5:');

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.customer_id) customer_id = request.customer_id;
    if (request.api_b64) api_b64 = request.api_b64;
      sendResponse();
});

chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);

		// ----------------------------------------------------------
		// This part of the script triggers when page is done loading
        //console.log("%cInstant loaded", "font-size:24px;");
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
        var el = document.querySelector(productmap[document.location.hostname.match(/^.*?\.(.*?)\..*$/)[1]]);
        if (el !== null) return el.innerText;
        return undefined;
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
    ourbutton.id = "instafication";
    if (theirbutton.name == 'addToCart') { ourbutton.style.marginTop="4px !important"; }
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

var Product = (function()   {
    function Product(name, price) {
        if (typeof name !== undefined) this.name = name;
        if (typeof price !== undefined) this.price = price;
    }
    Product.prototype.someFunction = function() {}
    return Product;
})();

function findLocal() {
    var xhr = new XMLHttpRequest();
    var response;

    xhr.open("GET", our_api + encodeURIComponent(product.name.replace(/\//g,'')), true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            response = JSON.parse(xhr.responseText);
            product.localprice = response.price;
            product.localstore = response.store;
            getQuote();
        }
    }
    xhr.send();
}

function getQuote() {
    var xhr = new XMLHttpRequest();
    var params={};
    var response;
    showSpinner();

    
    navigator.geolocation.getCurrentPosition(function(loc) {
        params['dropoff_address'] = loc.coords.latitude + "," + loc.coords.longitude;
        params['pickup_address'] = product.localstore + " Philadelphia, PA";
        
        var request = Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]) }).join('&');
        xhr.open("POST", postmates_api+customer_id+'/delivery_quotes', true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Authorization", 'Basic '+api_b64);
        xhr.addEventListener("load", function() {}, false);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                response = JSON.parse(xhr.responseText);
                product.quote_id = response.id;
                product.instantprice = (product.localprice + response.fee / 1000).toFixed(2);
                displayConfirm();
            }
        }
        xhr.send(request);
    });
}

function displayConfirm() {
    $(function() {
        var NewDialog = $('<div id="MenuDialog"><p>Order this now for $'+product.instantprice+'!</p></div>');
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
        hideSpinner();
        NewDialog.dialog("open");
    });
}

function createDelivery() {
    var xhr = new XMLHttpRequest();
    var params={};
    var response;

    navigator.geolocation.getCurrentPosition(function(loc) { 
        params['manifest'] = product.name;
        params['pickup_name'] = product.localstore;
        params['pickup_address'] = product.localstore + " Philadelphia, PA";
        params['pickup_phone_number'] = '123-456-7890';
        params['pickup_business_name'] = product.localstore;
        params['pickup_notes'] = 'Ordered using Instant. Pick up at front desk';
        params['dropoff_name'] = 'Me';
        params['dropoff_address'] = loc.coords.latitude + "," + loc.coords.longitude;
        params['dropoff_phone_number'] = '098-654-7321';
        params['dropoff_business_name'] = 'me';
        params['dropoff_notes'] = 'Leave it here.';
        params['quote_id'] = product.quote_id;

        var request = Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]) }).join('&');
        xhr.open("POST", postmates_api+customer_id+'/deliveries', true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Authorization", 'Basic '+api_b64);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                response = JSON.parse(xhr.responseText);
            }
        }
        xhr.send(request);
    });
}

function getDeliveries(callback) {
    var xhr = new XMLHttpRequest();
    var params={};
    var response;

    xhr.open("GET", postmates_api+customer_id+'/deliveries', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Authorization", "Basic "+api_b64);

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            response = JSON.parse(xhr.responseText);
            callback(response);
        }
    }
    xhr.send();
}

function cancelDelivery(id) {
    var xhr = new XMLHttpRequest();
    var response;

    xhr.open("POST", postmates_api+customer_id+'/deliveries/'+id+'/cancel', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Authorization", "Basic "+api_b64);

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            response = JSON.parse(xhr.responseText);
        }
    }
    xhr.send();
}

function showSpinner() {
    $('<div/>', {'class':'screen'}).css({'background-color':'rgba(1,1,1,0.2)','position':'fixed','width':'100%','height':'100%','top':'0px','left':'0px','z-index':'1000'}).appendTo('body');
    $('<img/>', {'src':chrome.extension.getURL('icons/iconspin.gif')}).css({'position':'absolute','opacity':'0.5','top':'50%','left':'50%','margin-right':'-50%','transform':'translate(-50%,-50%)','height':'160px'}).appendTo('.screen');
}

function hideSpinner() {
    $('.screen').remove();
}

