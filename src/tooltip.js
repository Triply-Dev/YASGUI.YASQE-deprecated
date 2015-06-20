'use strict';
var $ = require('jquery'),
	utils = require('./utils.js');

/**
 * Write our own tooltip, to avoid loading another library for just this functionality. For now, we only use tooltip for showing parse errors, so this is quite a tailored solution
 * Requirements: 
 * 		position tooltip within codemirror frame as much as possible, to avoid z-index issues with external things on page
 * 		use html as content
 */
module.exports = function(yasqe, parent, html) {
	var parent = $(parent);
	var tooltip;
	parent.hover(function() {
			if (typeof html == "function") html = html();
			tooltip = $("<div>").addClass('yasqe_tooltip').html(html).appendTo(parent);
			repositionTooltip();
		},
		function() {
			$(".yasqe_tooltip").remove();
		});



	/**
	 * only need to take into account top and bottom offset for this usecase
	 */
	var repositionTooltip = function() {
		if ($(yasqe.getWrapperElement()).offset().top >= tooltip.offset().top) {
			//shit, move the tooltip down. The tooltip now hovers over the top edge of the yasqe instance
			tooltip.css('bottom', 'auto');
			tooltip.css('top', '26px');
		}
	};
};