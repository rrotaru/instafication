var postmates_api = "https://api.postmates.com/v1/customers/";
var our_api = "https://instafication-api.herokuapp.com/search/";
var customer_id = localStorage['store.settings.username'].replace(/"/g,'');
var api_b64 = btoa(localStorage['store.settings.password'].replace(/"/g,''));
var deliveries;
var closed = {}
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, {customer_id:customer_id, api_b64:api_b64}, function(response) { });
});

var popupbody = $('#mainPopup');

function getDeliveries() {
    var xhr = new XMLHttpRequest();
    var params={'filter':'ongoing'};
    var response;

    xhr.open("GET", postmates_api+customer_id+'/deliveries', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Authorization", "Basic "+api_b64);

    var request = Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]) }).join('&');
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            response = JSON.parse(xhr.responseText);
            deliveries = response;
            for (i = 0; i < response.data.length; i++) {
                var date = new Date(response.data[i].created).toLocaleString();
                var id = response.data[i].id;
                if (!closed[id]) {
                    var div = $('<div/>')
                        .addClass('thumb')
                        .attr('id', id.toString())
                        .appendTo(popupbody);
                    var del = $('<button/>')
                        .addClass('close')
                        .html('&times;')
                        .click(function() { cancelDelivery($(this).parent().attr('id')); $(this).parent().remove(); })
                        .appendTo(div);
                    var s1 = $('<span/>')
                        .text(response.data[i].manifest.description)
                        .appendTo(div);
                    var s2 = $('<span/>')
                        .addClass('high')
                        .text(response.data[i].dropoff.address)
                        .appendTo(div);
                    var s3 = $('<span/>')
                        .addClass('mid')
                        .text(date)
                        .appendTo(div);
                    var s4 = $('<span/>')
                        .addClass('bottom')
                        .text(response.data[i].status)
                        .appendTo(div);
                }
            }

        }
    }
    xhr.send(request);
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
            closed[id] = 1;
        }
    }
    xhr.send();
}

getDeliveries();
