
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);
//document.getElementById("nav_placeholder").innerHTML='<object type="text/html" data="nav.html" ></object>';
$(function(){
	$("#nav_placeholder").load("../common/nav.html");
});


//document.getElementById("nav_placeholder").innerHTML = "<p>hello</p>";