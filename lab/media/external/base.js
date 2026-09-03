
$(function(){


	// 轮播图隐藏第二个相框的遮罩层
	function twoMask(){
		var maskTarget = $('.home-teacher .mask[1]')
		maskTarget.css('display','none');
	}

	// 轮播效果
	function move(){
		var btnLeft = $('.btn-left');
		var btnRight = $('.btn-right');
		// 采用相框外层套个Box移动box的left值；
		var box = $('.teacher-box');
		var boxSingle = $('.teacher-box .box');
		var w = parseInt(boxSingle.css('width'));

		var img = $('.home-teacher img');

		// 点击左按钮

		btnLeft.click(function(){
			btnRight.css('display','block');
			// var x = parseInt(box.position().left);
			// var move=parseInt((x-w));
			// box.animate({left: move}, 200);

			// 点击左按钮：active-box标签添加到下一个box上：
			var curBox = $('.teacher-box .active-box');
			curBox.removeClass('active-box');
			curBox.next().addClass('active-box');

			// 点击判断位置是否是-(x-1)*w  x是展示的照片的数量  w是一个照片框的宽度  x=4  w=384px；
			// 若位置是3*384  那么按钮隐藏 ，只显示向右按钮
			// if(x == -w*2){
   //  			btnLeft.css('display','none');
			// }else{
			// }

		})
		// 点击右按钮：
		//  btnRight.click(function(){
  //   		btnLeft.css('display','block');
		//  	var x = parseInt(box.position().left);
		// 	var move=parseInt((x+w));

		// 		if(x == 0){
		// 			move = -w*3;
		// 			box.animate({left: move}, 300);
		// 		}else{
		// 			 box.animate({left: move}, 300);
		// 		}
		// 	if(x == 0){
		// 		move = -w*3;
		// 		box.animate({left: move}, 500);
		// 	}else{
		// 		 box.animate({left: move}, 500);
		// 	}

		// 	 // 点击左按钮：active-box标签添加到下一个box上：
		// 	var curBox = $('.teacher-box .active-box');
		// 	curBox.removeClass('active-box');
		// 	curBox.prev().addClass('active-box');


		// 	// 点击判断位置是否是-(x-1)*w  x是展示的照片的数量  w是一个照片框的宽度  x=4  w=384px；
		// 	// 若位置是3*384  那么按钮隐藏 ，只显示向右按钮
		// 	if(x == -384){
  //   			btnRight.css('display','none');
  //   			btnLeft.css('display','block');
		// 	}else{
		// 	}
		// })
	}

	// 调整遮罩层大小
	function setResize(){
		var mask = $('.home-teacher .mask');
		var maskWitdh = mask.css('width');
		var img = $('.home-teacher img');
		var imgWidth = img.css('width');
		maskWitdh = mask.css('width', imgWidth);
		var maskHeight = mask.css('height');
		var imgheight = img.css('height');
		maskHeight = mask.css('height', imgheight);
	}

	move();
	twoMask()
	setResize();
	$(window).resize(function() {
		setResize();
				// setResizes();
	});

	function setResizes(){
		var mask = $('.works-box .mask');
		var maskWitdh = mask.css('width');
		var img = $('.works-box img');
		var imgWidth = img.css('width');
		maskWitdh = mask.css('width', imgWidth);
		var maskHeight = mask.css('height');
		var imgheight = img.css('height');
		maskHeight = mask.css('height', imgheight);
		var marginTop = parseInt(imgheight)/2-10;
		$('.describe').css('margin-top',marginTop);
	}
	setResizes();
	$(window).resize(function() {
		setResizes();
	});


	// 导航栏
	function moveNav(){
		// 动画短时间内重复出现卡顿：因为一个动画没完成就发生另一个动画 会跟不上：解决方法 延迟
        $('.header .nav li').hover(function(){
			var w = parseInt($(this).css('width'));
			$('.line').css('width',w);
			var index = $(this).index();
			var moveW = w*index;
            tId = setTimeout(function(){$('.line').animate({left:moveW}),200},100);
		},function(){
			 clearTimeout(tId); //清除定时操作
		});

		$('.header .nav ul').hover(function(){
		},function(){
			var moveW = parseInt($('.header .nav .active').index()*86);
			$('.line').animate({left:moveW}, 200);
		})
		$('.header .nav li').click(function(){
			$('.header .nav li').removeClass('active');
			$(this).addClass('active');
		})
	}
	moveNav();


	function cancel(){
		$('.search-xs').click(function(){
			$('.search-box-xs').fadeIn();
			$('.nav-xs-mask').fadeOut();
		})
		$('.cancel').click(function(){
			$('.search-box-xs').fadeOut();
		})



		$('.nav-xs-mask .nav-close-box').click(function(){
			$('.nav-xs-mask').fadeOut();
		})
		$('.header-xs-tk .nav-xs').click(function(){
			if($('.nav-xs-mask').is(':visible')){
				$('.nav-xs-mask').fadeOut();
				// $('.header-xs').css('background','#fff');
				// $('.header-xs .button-group-mask').fadeOut();

			}else{
				$('.header-xs .button-group-mask').fadeIn();
				$('.nav-xs-mask').fadeIn();
			}
		})

	}
	cancel();

	// $(window).scroll(function() {
	//         if( $(window).scrollTop() > 350){
	//            $('.nav-xs-mask').fadeOut();
	//            $('.header-xs .button-group-mask').hide();
	//            $('.header-xs').css('background','#fff');
	//         }else{
	//         }
	//     });
	// 子菜单展开项：
	$('.nav-box .parent-ul li').click(function(){
		$(this).parent().find('li').removeClass('active');
		$(this).addClass('active');
	})

	// 引入page点击按钮次数这样写减少了bug:连续点击按钮不会出现卡顿;

	function moveImg(){
		// 点击按钮的次数
		var page = 0;
		// 相框集
		var boxs = $('.teacher-box');

		// 相框
		var box = $('.teacher-box .box');
		// 一个相框的宽度
		var w = parseInt(box.css('width'));
		// 相框的总长度
		var l = box.length;

		$('.btns').click(function(){
			// 每点击一次 点击次数添加一次
			// page++;
			// 当点击次数超过相框的总个数，即点击下一张 没有图片了 相框集回到原位；

		})
		$('.btn-left').click(function(){
			// var page = 0;
			page++;
			if(page > l-1){
				boxs.animate({left: 0}, 200);
				page=0;
			}else{
				boxs.animate({left:-w*page},200);
			}
			console.log(111,page,l);

		})
		$('.btn-right').click(function(){
			page--;
			if(page > l-1){
				boxs.animate({left: 0}, 200);
			}else{
				boxs.animate({left:w*page},200);
			}
				page=0;

			console.log(222,page,l);
		})
	}
	moveImg();
	var i = 0;

	$('.header .last-li').click(function(){
		if(i == 0){
			$('.search-box').show();
			i = 1;
		}else{
			$('.search-box').hide();
			i = 0;
		}

	})
	// 表格宽度显示：
	$a = $('.main-research table:first-child tbody tr').find('td').length;
	if($a > 2){
		$('.main-research table').css('width','100%');
	}else{
		$('.main-research table').css('width','100%');
	}
	// 获取高度；
	var wHeight = $(document).height();
	// alert(wHeight);
	console.log(wHeight)
	$('.nav-xs-mask').css('height',wHeight);
	console.log($('.nav-xs-mask').height())

})
