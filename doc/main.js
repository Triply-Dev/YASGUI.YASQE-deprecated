$ = jQuery = require("jquery");

require("../node_modules/twitter-bootstrap-3.0.0/dist/js/bootstrap.js");



$(function() {
  $('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 400);
        return false;
      }
    }
  });
});


$(document).ready(function() {
	//get the latest hosted version
	if ($("#cdnDownload").length > 0) {
		//only draw when we've got some place to print this info (might not be on all pages where we include this js file)
		$.get("http://api.jsdelivr.com/v1/jsdelivr/libraries?name=yasqe&fields=lastversion", function(data) {
			if (data.length > 0) {
				var version = data[0].lastversion;
				$("#yasqeCss").text("<link href='//cdn.jsdelivr.net/yasqe/" + version + "/yasqe.min.css' rel='stylesheet' type='text/css'/>");
				$("#yasqeJsBundled").text("<script src='//cdn.jsdelivr.net/yasqe/" + version + "/yasqe.bundled.min.js'></script" + ">");
				$("#yasqeJs").text("<script src='//cdn.jsdelivr.net/yasqe/" + version + "/yasqe.min.js'></script" + ">");
			} else {
				console.log("failed accessing jsdelivr api");
				$("#cdnDownload").hide();
			}
		}).fail(function() {
			console.log("failed accessing jsdelivr api");
			$("#cdnDownload").hide();
		});
	}
});

