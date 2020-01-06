var latLons = Array();
var world = Array();
var swBound; //southwest bound for map
var neBound; //northeast 
var bound; //google maps bound 

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
	map.fitBounds(bound);
	
}
//**************************************************************************
//file name is null if file is uploaded
function read(gpxFile, fileName) {
	document.getElementById("header").innerHTML = "File Uploaded..."
	//const gpxFile = document.getElementById("GPX_file").files[0];
	let text;
	let xmlText;
	if (!gpxFile) {
		//use example file
		const request = new XMLHttpRequest();
		request.open('GET', fileName, false);
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

//creates data elements from xml (.gpx) doc and calls createWorld
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
	let currLatLon;

	var southmost = 180;
	var northmost = -180;
	var eastmost = -180;
	var westmost = 180;
	// swBound = new google.maps.LatLng(180, 180);
	// neBound = new google.maps.LatLng(-180, -180);
	for (const dataPacket of trkseg.children) {
		const lat = dataPacket.attributes[0].nodeValue;
		const lon = dataPacket.attributes[1].nodeValue;
		const elev = dataPacket.children[0].firstChild.nodeValue;
		const time = dataPacket.children[1].firstChild.nodeValue;
		world[index] = [lat, lon, elev, time]; //.append if not using index

		latLons[index] = new google.maps.LatLng(lat, lon);
		// var neLat = neBound.lat();
		// var neLng = neBound.lng();
		if (lat < southmost) {
			southmost = lat;
		} 
		if (lat > northmost) {
			northmost = lat;
		}
		if (lon < westmost) {
			westmost = lon;
		} 
		if (lon > eastmost) {
			eastmost = lon;
		}
		//document.getElementById("print_testing").innerHTML += "<tr><td>"+index + " </td><td>" + lat +" </td><td>"+ lon + " </td><td>" + elev + " </td></tr>";
		index++;
	}
	bound = new google.maps.LatLngBounds(new google.maps.LatLng(southmost, eastmost), new google.maps.LatLng(northmost, westmost));
}


// function myFun(callback) {
// 	setTimeout(() => {
// 		const result = 5;
// 		console.log('finished');
// 		callback(result);
// 	}, 5000);
//}
