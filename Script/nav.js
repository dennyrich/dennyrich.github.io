// var script = document.createElement('script');
// script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
// script.type = 'text/javascript';
// document.getElementsByTagName('head')[0].appendChild(script);

	//$("#nav_placeholder").load("../common/nav.html");

document.write('<div>\
<nav class="navbar navbar-expand-lg navbar-light" style="background-color: #e3f2fd;">\
 <a class="navbar-brand" href="/">Denny Rich</a>\
 <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">\
   <span class="navbar-toggler-icon"></span>\
 </button>\
 <div class="collapse navbar-collapse" id="navbarSupportedContent">\
   <ul class="navbar-nav mr-auto">\
	 <li class="nav-item active">\
	   <a class="nav-link" href="/">Home <span class="sr-only">(current)</span></a>\
	 </li>\
	 <li class="nav-item">\
	   <a class="nav-link" href="/data/Resume.pdf">Resume</a>\
	 </li>\
	 <li class="nav-item dropdown">\
	   <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\
		 Projects\
	   </a>\
	   <div class="dropdown-menu" aria-labelledby="navbarDropdown">\
		 <a class="dropdown-item" href="/GPX.html#about">GPX Reader</a>\
		 <a class="dropdown-item" href="/system.html">Control System</a>\
		 <a class="dropdown-item" href="#" aria-disabled="true">This Site I Guess</a>\
	   </div>\
	 </li>\
 </div>\
</nav>\
\<div/>');