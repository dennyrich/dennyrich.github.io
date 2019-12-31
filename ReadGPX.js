

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
		const parser = new DOMParser();	
		reader.onloadend = function () {
			text = reader.result;
			//convert result to xml format
			xmlText = parser.parseFromString(text, "text/xml");
			parseGPX(xmlText);
		};
		reader.readAsText(gpxFile);
	}
}

function parseGPX(text) {
	let parser = new DOMParser();
	let trk = text.getElementsByTagName("trk")[0];
	let nameTag = trk.getElementsByTagName("name")[0]; //or childnodes[0]
	let nameValue = nameTag.firstChild;
	console.log(nameValue);

	let trkseg = trk.children[2];
	createWorld(trkseg);
}

function createWorld(trkseg) {
	for (const dataPacket of trkseg.children) {
		const text = dataPacket.childNodes[0];
		document.getElementById("print_testing").innerHTML += text + "\r\n";
	}
}


// function myFun(callback) {
// 	setTimeout(() => {
// 		const result = 5;
// 		console.log('finished');
// 		callback(result);
// 	}, 5000);
//}
