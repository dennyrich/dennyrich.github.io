

function read(gpxFile) {
	document.getElementById("header").innerHTML = "File Uploaded..."
	//const gpxFile = document.getElementById("GPX_file").files[0];
	let text;
	let xmlText;
	if (!gpxFile) {
		//use example file
		const request = new XMLHttpRequest();
		request.open('GET', '/Afternoon_Run.gpx', false);
		request.send(null);
		text = request.responseText;
		xmlText = request.responseXML;
		parseGPX(xmlText);
	} else {
		//using user file
		const reader = new FileReader();	
		reader.onloadend = function () {
			text = reader.result;
			parseGPX(text);
		};
		reader.readAsText(gpxFile);
	}
}

function parseGPX(text) {
	console.log("done");
}


function myFun(callback) {
	setTimeout(() => {
		const result = 5;
		console.log('finished');
		callback(result);
	}, 5000);
}
