

var latLons = Array();
var world = Array();
var swBound, neBound, bound; //sw, ne, and google maps object bound
var path; //google maps object
var map;
var cont = true;
var segments = Array();
var HEIGHT = document.getElementById("canvas").height;
var WIDTH = document.getElementById("canvas").width;



var SCALE;
var horizon;
const ELEV_SCALE = 3;
const CURVE_MAGNIFY = 5;
var CAMERA_HEIGHT;
var CAMERA_DIST_BEHIND;
var average_magnitude;

var clouds = Array();

//const canvas = document.getElementById("canvas");
const canvas = document.getElementById("canvas");
var	ctx = canvas.getContext('2d');
//draw initial display
ctx.font = "30px Arial";
ctx.fillStyle = "red";
ctx.textAlign = "center";

function myMap() {
  var mapProp= {
    center : new google.maps.LatLng(37.77,-122.41),
    zoom : 9
  };
  map = new google.maps.Map(document.getElementById("googleMap"),mapProp);
}

function drawMap() {
	if (latLons.length == 0) {
		alert("no file uploaded or has incorrect data");
		return;
	}
	var lineSymbol = {
		path: google.maps.SymbolPath.CIRCLE,
		scale: 8,
		strokeColor: '#393'
	};
	path = new google.maps.Polyline({
		path: latLons,
		geodesic: true,
		strokeColor: '#FF0000',
		strokeOpacity: 1.0,
		strokeWeight: 2,
		icons: [{icon: lineSymbol, offset: '0%'}]
	});
	path.setMap(map);
	map.fitBounds(bound);
}
//**************************************************************************/
function createWorldFromStream(steam) {
	
}
//file name is null if file is uploaded
function read() {
	let text, xmlText;
	if (document.getElementById("file").value.length > 0) {
		//use example file
		const fileName = document.getElementById("file").value;
		const request = new XMLHttpRequest();
		request.open('GET', fileName, false);
		request.send(null);
		text = request.responseText;
		xmlText = request.responseXML;
		parseGPX(xmlText);
	} else {
		//using user file
		if (document.getElementById("GPX_file").files.length == 0) {
			alert("no file uploaded");
			return;
		}
		const gpxFile = document.getElementById("GPX_file").files[0];
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
	//document.getElementById("header").innerHTML = "File Uploaded..."
}

//creates data elements from xml (.gpx) doc and calls createLatLonElevTime
function parseGPX(text) {
	let parser = new DOMParser();
	let trk = text.getElementsByTagName("trk")[0];
	let nameTag = trk.getElementsByTagName("name")[0]; //or childnodes[0]
	let nameValue = nameTag.firstChild;
	// console.log(nameValue);

	let trkseg = trk.children[2];
	createLatLonElevTimeGPX(trkseg);
}

// create array of [lat, lon, elev, time] from trkseg of GPX file
function createLatLonElevTimeGPX(trkseg) {
	latLonElevTimeArr = Array();
	for (const dataPacket of trkseg.children) {
		const lat = dataPacket.attributes[0].nodeValue;
		const lon = dataPacket.attributes[1].nodeValue;
		const elev = dataPacket.children[0].firstChild.nodeValue;
		const time = Date.parse(dataPacket.children[1].firstChild.nodeValue);
		latLonElevTimeArr.push([lat, lon, elev, time]);
	}

	createWorld(latLonElevTimeArr, true);
}
// create array of [lat, lon, elev, time] from stava stream object
function createLatLonElevTimeStream(stream) {
	latLonElevTimeArr = Array();
	var lat, lon, elev, time;
	for (let i = 0; i < stream["time"].data.length; i++) {
		lat = stream["latlng"].data[i][0];
		lon = stream["latlng"].data[i][1];
		elev = stream["altitude"].data[i]
		time = stream["time"].data[i];
		latLonElevTimeArr.push([lat, lon, elev, time]);
	}

	createWorld(latLonElevTimeArr, false);
}

// create world of [lat, lon, elev, time], set bounds for map, set scale
function createWorld(latLonElevTimeArr, isTrkSeg) {

	var southmost = 180;
	var northmost = -180;
	var eastmost = -180;
	var westmost = 180;

	const firstPacket = latLonElevTimeArr[0];
	var total_magnitude = 0;
	var prevLat = firstPacket[0];
	var prevLon =  firstPacket[1];
	for (const dataPacket of latLonElevTimeArr) {
		const lat = dataPacket[0];
		const lon = dataPacket[1];
		const elev = dataPacket[2];
		const time = dataPacket[3];

		world.push([lat, lon, elev, time]);

		total_magnitude += Math.sqrt((lat - prevLat) ** 2 + (lon - prevLon) ** 2);
		latLons.push(new google.maps.LatLng(lat, lon));
	
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
		prevLat = lat;
		prevLon = lon;
	}
	average_magnitude = total_magnitude / world.length;
	
	//desired height = HEIGHT / 20 --> averave_magnitude * SCALE = desired height --> Scale = (HEIGHT / 6) / average_magnitude
	SCALE = (HEIGHT / 30) / average_magnitude;
	CAMERA_DIST_BEHIND = average_magnitude * SCALE; 
	CAMERA_HEIGHT = HEIGHT - average_magnitude * SCALE * 5;
	$("#simulation").modal('show');
	bound = new google.maps.LatLngBounds(new google.maps.LatLng(southmost, eastmost), new google.maps.LatLng(northmost, westmost));
	createSegments(world, isTrkSeg);
}
//***************************************************************************** */

class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	magnitude() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	static angleBetween(v1, v2) {
		return  Math.atan((v1.x * v2.y - v1.y * v2.x) / (v1.x * v2.x + v1.y * v2.y));
	}
}


function createSegments(world, isTrkSeg) {
	var distX, distY, distElev, currVec, angleFromPrev, roadObject;
	var prevVec = new Vector(0, 0);

	var dark = true;

	var len = 0;
	var curveAmount = 0;
	var changeElevScaled = 0;
	var haversineDistance;
	var deltaT;
	var pace;
	var grade;

	for (let i = 1; i < world.length; i++) {

		distX = world[i][0] - world[i - 1][0];
		distY = world[i][1] - world[i - 1][1];
		distElev = (world[i][2] - world[i - 1][2]) * 3.281;
		currVec = new Vector(distX, distY);
		angleFromPrev = Vector.angleBetween(prevVec, currVec); //order matters, check sign
		changeElevScaled += 0;//distElev * ELEV_SCALE;
		
		if (Number.isNaN(angleFromPrev)) {
			angleFromPrev = 0; //division by 0
		}
		//len and curveAmount accumulate if segments are too short
		len  += currVec.magnitude() * Math.cos(angleFromPrev) * SCALE;
		curveAmount += currVec.magnitude() * Math.sin(angleFromPrev) * SCALE * CURVE_MAGNIFY;
		if (len < 5) {
			continue;
		}
	
		haversineDistance = getDistanceFromLatLon(world[i][0], world[i][1], world[i - 1][0], world[i - 1][1]);
		if (isTrkSeg) {
			deltaT = (world[i][3] - world[i - 1][3]) / 1000;
		} else {
			deltaT = (world[i][3] - world[i - 1][3]);
		}
		paceSecondsPerMile = deltaT / haversineDistance;
		grade = Math.round(distElev / (haversineDistance * 5280) * 100);
		pace = Math.floor(paceSecondsPerMile / 60).toString().padStart(2, "0") + ":" + Math.round(paceSecondsPerMile % 60).toString().padStart(2, "0");
		segments.push({
				length 		: len + changeElevScaled, 
				curve 		: curveAmount, 
				dark 		: dark,
				x 			: world[i][0], y : world[i][1],
				roadObject 	: roadObject,
				hDistance 	: haversineDistance,
				deltaT 		: deltaT,
				pace 		: pace,
				elev 		: Math.round(world[i][2] * 3.281), //convert to feet
				grade 		: grade
		});
		prevVec = currVec;
		dark = !dark;
		len = 0;
		curveAmount = 0;
	}
}


//********************************************************************************** */
function stop() {
	cont = false;
	//document.getElementById("header").innerHTML = "Waiting for File Upload (No File Uploaded)"
	myMap.zoom = 9;
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	path.setMap(null);
	myMap();
	$("#simulation").modal("hide");
}
function run() {
  	cont = true;
	var runner = new Person();
	if (latLons.length == 0) {
		alert("no file uploaded or has incorrect data");
		return;
	}
	
	drawMap();
	myMap.zoom = 2;

	var polygonList;

	function getNextPolygon(index, bLeftX, bRightX, bY, distanceTo, offset) {
		const currSeg = segments[index];
		const totalDistance = distanceTo + currSeg.length * offset;
		const tY = CAMERA_HEIGHT * CAMERA_DIST_BEHIND / totalDistance;
		//const tY = 500 / totalDistance;
		// actual_height / height_on_screen
		if (bY - tY < 1) {
			return null;
		}
		const bottomCenter = (bRightX - bLeftX) / 2;
		const width = WIDTH * CAMERA_DIST_BEHIND / distanceTo; //roadWidth * shrinkFactor
		const curveOffset = currSeg.curve * CAMERA_DIST_BEHIND / distanceTo;
		const tLeftX = bottomCenter + curveOffset - width / 2; 
		const tRightX = bottomCenter + curveOffset + width / 2;
		return {
			bLeft : {x : bLeftX, y : bY},
			bRight : {x : bRightX, y : bY},
			tLeft : {x : tLeftX, y : tY},
			tRight : {x : tRightX, y : tY},
			dark : currSeg.dark,
			roadObject : currSeg.roadObject
		}
	}
	function drawWithOffset(offset, bottomIndex) {
		//initialize vars
		document.getElementById("pace").innerHTML = "Pace: " + segments[bottomIndex].pace + " per mile";
		document.getElementById("elev").innerHTML = "Elev: " + segments[bottomIndex].elev.toString().padStart(5, 0) + " feet";
		document.getElementById("grade").innerHTML = "Grade " + segments[bottomIndex].grade.toString().padStart(2, 0) +"%";
		var distanceTo = CAMERA_DIST_BEHIND;
		var index = bottomIndex;
		//const width = WIDTH * CAMERA_DIST_BEHIND / CAMERA_DIST_BEHIND; 
		var bLeftX = WIDTH/2 - WIDTH / 2; 
		var bRightX = WIDTH/2 + WIDTH / 2;
		var bottomY = HEIGHT;
		polygonList = Array();
		horizon = HEIGHT / 6; 

		bottomSeg = segments[bottomIndex];
		map.setCenter(new google.maps.LatLng(bottomSeg.x,bottomSeg.y));

		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(bottomSeg.x,bottomSeg.y),
			map: map,
			icon : {url : "/images/ant_freeze.gif", scaledSize : new google.maps.Size(30, 30)}
		  });

		setTimeout(function() {marker.setMap(null)}, 100);
		var firstOffset = offset;
		while(bottomY > horizon && index < segments.length) {
			nextPolygon = getNextPolygon(index, bLeftX, bRightX, bottomY, distanceTo, firstOffset);
			if (!nextPolygon) {
				break;
			}
			polygonList.push(nextPolygon);
			//update vars
			bLeftX = nextPolygon.tLeft.x;
			bRightX = nextPolygon.tRight.x;
			bottomY = nextPolygon.tRight.y;
			distanceTo += segments[index].length * firstOffset;
			firstOffset = 1; //offset only matters for first segment
			index ++;
		}

		frame(polygonList, runner); //-10 to top Y so it covers road
		runner.updateState();
		if (offset > 0.01 && cont) { //0.25 accounts for fp errors
			 setTimeout(drawWithOffset, 9, offset - 0.03, bottomIndex);
		} else if (cont) {
			//reset offset to 1, increment bottom index, -1 means topMost won't be used
			setTimeout(drawWithOffset, 9, 1, bottomIndex + 1);
		} else {
			latLons = Array();
			segments = Array();
			return
		}
	}
	drawWithOffset(1, 1, -1); //start width index at 1, offset at 1
}

function frame(polyList, runner) {

	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	ctx.fillStyle = "Green";
	ctx.fillRect(0, horizon, WIDTH, HEIGHT - horizon);
	for (let i = 0; i < polyList.length; i++) {
		
		drawPoly(polyList[i], polyList[i].dark ? "black" : "grey");
	}
	ctx.fillStyle = "Blue";
	ctx.fillRect(0, 0, WIDTH, horizon);
	var s = polyList[0];
	runner.draw();
}

function drawPoly(polygon, color) {
	const bRight = polygon.bRight;
	const bLeft = polygon.bLeft;
	const tRight = polygon.tRight;
	const tLeft = polygon.tLeft;
	const height = bRight.y - tRight.y;
	ctx.moveTo(bRight.x, bRight.y);
	ctx.beginPath();
	ctx.lineTo(bLeft.x, bLeft.y);
	ctx.lineTo(tLeft.x, tLeft.y);
	ctx.lineTo(tRight.x, tRight.y);
	ctx.lineTo(bRight.x, bRight.y);
	ctx.fillStyle = color;
	ctx.fill();
}
function drawRoadObject(img, base, dim) {
	ctx.drawImage(img, base.x, base.y, dim, dim);
}
//*************************************************** ****** ****** */

class Person {
	constructor() {
		this.state = 0;
		this.jumpHeight = 0;
		this.wayUp = true;
		this.armSwing = true;
		this.armDown = 60;
	}
	draw() {
		const shirtHeight = 100;
		const shirtWidth = 80;
		const headRadius = 40;
		const armOut = 30;
		const armTop = HEIGHT - shirtHeight - this.state;
		ctx.fillStyle = 'Crimson';
		ctx.fillRect(WIDTH / 2 - shirtWidth / 2, armTop, shirtWidth, shirtHeight);
		ctx.fillStyle = 'DarkOliveGreen';
		ctx.beginPath();
		ctx.arc(WIDTH / 2, HEIGHT - shirtHeight - headRadius - this.state, headRadius, 0, Math.PI * 2 );
		ctx.fill();
		//legs
		ctx.fillStyle = 'ForestGreen';
		ctx.fillRect(WIDTH/2 - shirtWidth/2, HEIGHT - this.state, shirtWidth, this.state);
		//left
		ctx.strokeStyle = "DarkOliveGreen";
		ctx.beginPath();
		ctx.lineWidth = 15;
		ctx.moveTo(WIDTH/2 - shirtWidth/2, armTop);
		ctx.lineTo(WIDTH/2 - shirtWidth/2 - armOut, armTop + this.armDown + 10);
		ctx.stroke();
		//right
		ctx.beginPath();
		ctx.moveTo(WIDTH/2 + shirtWidth/2, armTop);
		//					right arm height is "inverse" of left, 10 is a constant added
		ctx.lineTo(WIDTH/2 + shirtWidth/2 + armOut, armTop + (60 - this.armDown) + 10);
		ctx.stroke();
	}
	updateState() {
		if (this.armSwing) {
			this.armDown -= 2;
			if (this.armDown <= 0) {
				this.armSwing = false;
			}
		} else {
			this.armDown += 2;
			if (this.armDown >= 60) {
				this.armSwing = true;
			}
		}

		if (this.wayUp) {
			this.state += 1;
			if (this.state >= 15) {
				this.wayUp = false;
			}
		} else {
			this.state -= 1;
			if (this.state <= 0) {
				this.wayUp = true;
			}
		}
	}

}
/**
 * helper functions below
 */
// taken from https://stackoverflow.com/a/27943 (changed to miles)
function getDistanceFromLatLon(lat1,lon1,lat2,lon2) {
	var R = 3958.8; // Radius of the earth in km
	var dLat = deg2rad(lat2-lat1);  // deg2rad below
	var dLon = deg2rad(lon2-lon1); 
	var a = 
	  Math.sin(dLat/2) * Math.sin(dLat/2) +
	  Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
	  Math.sin(dLon/2) * Math.sin(dLon/2)
	  ; 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c; // Distance in mi 
	return d;
  }
  
  function deg2rad(deg) {
	return deg * (Math.PI/180)
  }

