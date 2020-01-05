var map;
var latLons = Array();
var world = Array();

function myMap() {
  var mapProp= {
    center:new google.maps.LatLng(37.77,-122.41),
    zoom:9
  };
  map = new google.maps.Map(document.getElementById("googleMap"),mapProp);
}

function drawMap() {
	if (latLons.length == 0) {
		alert("no file uploaded or has incorrect data");
		return;
	}
	var path = new google.maps.Polyline({
		path: latLons,
		geodesic: true,
		strokeColor: '#FF0000',
		strokeOpacity: 1.0,
        strokeWeight: 2
	});
	path.setMap(map);
}
//**************************************************************************

function read(gpxFile) {
	document.getElementById("header").innerHTML = "File Uploaded..."
	//const gpxFile = document.getElementById("GPX_file").files[0];
	let text;
	let xmlText;
	if (!gpxFile) {
		//use example file
		const request = new XMLHttpRequest();
		request.open('GET', '/Lunch_Run-2.gpx', false);
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
	// console.log(nameValue);

	let trkseg = trk.children[2];
	createWorld(trkseg);
}


function createWorld(trkseg) {
	//let world = Array();
	//let latLons = Array();
	let index = 0;
	for (const dataPacket of trkseg.children) {
		const lat = dataPacket.attributes[0].nodeValue;
		const lon = dataPacket.attributes[1].nodeValue;
		const elev = dataPacket.children[0].firstChild.nodeValue;
		const time = dataPacket.children[1].firstChild.nodeValue;
		world[index] = [lat, lon, elev, time]; //.append if not using index
		latLons[index] = new google.maps.LatLng(lat, lon);
		//document.getElementById("print_testing").innerHTML += "<tr><td>"+index + " </td><td>" + lat +" </td><td>"+ lon + " </td><td>" + elev + " </td></tr>";
		index++;
	}
}


// function myFun(callback) {
// 	setTimeout(() => {
// 		const result = 5;
// 		console.log('finished');
// 		callback(result);
// 	}, 5000);
//}
