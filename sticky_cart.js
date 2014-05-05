/****
Simple JS to stick a module to the top of the viewport
when scrolled past a certain point, and unstick at another
arbitrary boundary 
****/

$(function(){
	/*cart scrolling logic*/
	var $photo_cart = $('#photo_cart'),
	page_content = $('#page_content').offset().top,
	/*the fixed cart has a 10px top margin*/
	fixed_cart_offset = 10, 
	/*and a 10px bottom margin + 3px shadow*/
	fixed_cart_bottom = 13;
	$window = $(window);	

	$window.scroll(function() {				
		/*when we're past the top of create account*/
		if($window.scrollTop() > page_content) {
			/*stick the cart at the top of the viewport*/
			$photo_cart.addClass('stuck');
							
			/*the point at which we want to stick the cart*/
			var buffer = $('footer').offset().top - $('#photo_cart').height() - fixed_cart_offset; 		
			/*when it gets to the faq stick it there*/
			if($window.scrollTop() >= buffer) {
				/*this should be consistently recalculated in case photos are moved around -3 is for cart shadow*/
				var total = $('#page_content').height() - $('#photo_cart').height() - fixed_cart_bottom; 
				$photo_cart.removeClass('stuck');
				$photo_cart.css({top: total}); 
			}				
			else if($window.scrollTop() < buffer) {
				$photo_cart.css({top: 0});
			}	
		} 
		else {
			$photo_cart.removeClass('stuck');
		}
	});

})		