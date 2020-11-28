

var latLons = Array();
var world = Array();
var swBound, neBound, bound; //sw, ne, and google maps object bound
var path; //google maps object
var map;
var cont = true;
var segments = Array();
var HEIGHT = document.getElementById("canvas").height;
var WIDTH = document.getElementById("canvas").width;
const SLIDER = document.getElementById("myRange");

var SCALE;
const HORIZON = HEIGHT / 10;
var horizon = HORIZON;
const ELEV_SCALE = 1;
var CAMERA_HEIGHT;
var CAMERA_DIST_BEHIND;
var average_magnitude;

var clouds = Array();

//const canvas = document.getElementById("canvas");
const canvas = document.getElementById("canvas");
var ctx = canvas.getContext('2d');
//draw initial display
ctx.font = "30px Arial";
ctx.fillStyle = "red";
ctx.textAlign = "center";

function myMap() {
	var mapProp = {
		center: new google.maps.LatLng(37.77, -122.41),
		zoom: 9
	};
	map = new google.maps.Map(document.getElementById("googleMap"), mapProp);
}

function drawMap(bound) {
	if (latLons.length == 0) {
		alert("no activity chosen/file uploaded or has incorrect data");
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
		icons: [{ icon: lineSymbol, offset: '0%' }]
	});
	console.log(bound)
	path.setMap(map);
	map.fitBounds(bound);
	
}
//**************************************************************************/
function createWorldFromStream(stream) {
	SLIDER.setAttribute("max", stream["time"].data.length);
	var latLonElevTimeArr = Array();
	var lat, lng, elev, time;
	for (var i = 0; i < stream["latlng"]["data"].length; i++) {
		lat = stream["latlng"]["data"][i][0];
		lng = stream["latlng"]["data"][i][1];
		elev = stream["altitude"]["data"][i];
		time = stream["time"]["data"][i];
		latLonElevTimeArr.push([lat, lng, elev, time]);
	}
	createWorld(latLonElevTimeArr, false);
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
	let trk = text.getElementsByTagName("trk")[0];
	let nameTag = trk.getElementsByTagName("name")[0]; //or childnodes[0]

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

// create world of [lat, lon, elev, time], set bounds for map, set scale
function createWorld(latLonElevTimeArr, isTrkSeg) {

	var southmost = 180;
	var northmost = -180;
	var eastmost = -180;
	var westmost = 180;

	const firstPacket = latLonElevTimeArr[0];
	var total_magnitude = 0;
	var prevLat = firstPacket[0];
	var prevLon = firstPacket[1];
	var bound = new google.maps.LatLngBounds();
	for (const dataPacket of latLonElevTimeArr) {
		const lat = dataPacket[0];
		const lon = dataPacket[1];
		const elev = dataPacket[2];
		const time = dataPacket[3];

		world.push([lat, lon, elev, time]);

		total_magnitude += Math.sqrt((lat - prevLat) ** 2 + (lon - prevLon) ** 2);
		latLons.push(new google.maps.LatLng(lat, lon));
		bound.extend(new google.maps.LatLng(lat, lon));

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
	SCALE = (HEIGHT / 4) / average_magnitude;
	CAMERA_DIST_BEHIND = average_magnitude * SCALE / 2;
	CAMERA_HEIGHT = HEIGHT - average_magnitude * SCALE * 5;
	//$("#simulation").modal('show');
	//bound = new google.maps.LatLngBounds(new google.maps.LatLng(southmost, eastmost), new google.maps.LatLng(northmost, westmost));
	createSegments(world, isTrkSeg);
	drawMap(bound);
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
		return Math.atan((v1.x * v2.y - v1.y * v2.x) / (v1.x * v2.x + v1.y * v2.y));
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
	var stream = {
		"velocity_smooth": {"data": []},
		"time" : {"data": []}
	};

	for (let i = 1; i < world.length; i++) {

		distX = world[i][0] - world[i - 1][0];
		distY = world[i][1] - world[i - 1][1];
		distElev = (world[i][2] - world[i - 1][2]) * 3.281;
		currVec = new Vector(distX, distY);
		angleFromPrev = Vector.angleBetween(prevVec, currVec); //order matters, check sign
		changeElevScaled += distElev * ELEV_SCALE;

		if (Number.isNaN(angleFromPrev)) {
			angleFromPrev = 0; //division by 0
		}
		//len and curveAmount accumulate if segments are too short
		len += currVec.magnitude() * Math.cos(angleFromPrev) * SCALE;
		curveAmount += currVec.magnitude() * Math.sin(angleFromPrev) * SCALE;
		if (len < 5) {
			continue;
		}

		haversineDistance = getDistanceFromLatLon(world[i][0], world[i][1], world[i - 1][0], world[i - 1][1]);
		if (isTrkSeg) {
			deltaT = (world[i][3] - world[i - 1][3]) / 1000;
			stream["velocity_smooth"]["data"].push(haversineDistance / deltaT / 60);
			stream["time"]["data"].push(world[i][3]);
		} else {
			deltaT = (world[i][3] - world[i - 1][3]);
		}
		paceSecondsPerMile = deltaT / haversineDistance;
		grade = Math.round(distElev / (haversineDistance * 5280) * 100);
		pace = Math.floor(paceSecondsPerMile / 60).toString().padStart(2, "0") + ":" + Math.round(paceSecondsPerMile % 60).toString().padStart(2, "0");
		segments.push({
			length: len,
			curve: curveAmount,
			dark: dark,
			x: world[i][0], y: world[i][1],
			roadObject: roadObject,
			hDistance: haversineDistance,
			changeElevScaled: changeElevScaled,
			pace: pace,
			elev: Math.round(world[i][2] * 3.281), //convert to feet
			grade: grade
		});
		prevVec = currVec;
		dark = !dark;
		len = 0;
		curveAmount = 0;
		changeElevScaled = 0;
	}
	if (isTrkSeg) {
		SLIDER.setAttribute("max", stream["time"].data.length);
		plotPaceVsTime(stream);
	}
	
}


//********************************************************************************** */
function hardStop() {
	location.reload();
}
function stop() {
	cont = false;
	//document.getElementById("header").innerHTML = "Waiting for File Upload (No File Uploaded)"
	if (myMap) {
		myMap.zoom = 9;
	}
	if (path) {
		path.setMap(null);
	}
	segments = Array();
	latLons = Array();
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	myMap();
	//$("#simulation").modal("hide");
}
function run() {
	cont = true;
	var runner = new Person();
	if (latLons.length == 0) {
		alert("no activity chosen/file uploaded or has incorrect data");
		return;
	}
	myMap.zoom = 2;

	var polygonList;
	var curveFromPrev = 0;

	//begin animation loop
	function drawWithOffset(offset) {
		var bottomIndex = parseInt(SLIDER.value);
		if (!segments[bottomIndex]) {
			return;
		}
		//initialize vars
		document.getElementById("pace").innerHTML = "Pace: " + segments[bottomIndex].pace + " /mi";
		document.getElementById("elev").innerHTML = "Elev: " + segments[bottomIndex].elev.toString().padStart(5, 0) + " ft";
		document.getElementById("grade").innerHTML = "Grade " + segments[bottomIndex].grade.toString().padStart(2, 0) + "%";

		var index = bottomIndex;

		polygonList = Array();
		horizon = HEIGHT / 6;

		bottomSeg = segments[bottomIndex];
		map.setCenter(new google.maps.LatLng(bottomSeg.x, bottomSeg.y));

		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(bottomSeg.x, bottomSeg.y),
			map: map,
			icon: { url: "/images/ant_freeze.gif", scaledSize: new google.maps.Size(30, 30) }
		});

		setTimeout(function () { marker.setMap(null) }, 100);
		if (offset == 1) {
			extendTrace(bottomIndex);
		}

		horizon = HORIZON - bottomSeg.changeElevScaled / 3;
		//intialize values to inititial values
		curveFromPrev = 0;
		var sideDist = 0;
		var forwardDist = CAMERA_DIST_BEHIND * offset;
		var screenY = HEIGHT * CAMERA_DIST_BEHIND / (forwardDist);
		var screenLeftX = WIDTH / 2 - (WIDTH / 2 - 0) * CAMERA_DIST_BEHIND / forwardDist;
		var screenRightX = WIDTH / 2 - (WIDTH / 2 - WIDTH) * CAMERA_DIST_BEHIND / forwardDist;
		var prevLeftCoord = { x: 0, y: HEIGHT };
		var prevRightCoord = { x: WIDTH, y: HEIGHT };
		var screenLeftX, screenRightX, screenY, realRightX, realLeftX;
		var firstOffset = offset;


		while (prevRightCoord.y > horizon && index < segments.length && index - bottomIndex < 20) {
			currSeg = segments[index];
			curveFromPrev += currSeg.curve * firstOffset * 10;
			sideDist += curveFromPrev;
			forwardDist += currSeg.length * firstOffset;
			realLeftX = sideDist;
			realRightX = WIDTH + sideDist;
			// (width/2 - sceeenX) / CAMERA_DIST_BEHIND = (width/2 - realX) / forwardDist
			// screenX = width/2 - (width/2 - realX) * CAMERA_DIST_BEHIND / forwardDist
			screenY = HEIGHT * CAMERA_DIST_BEHIND / (forwardDist);
			screenLeftX = WIDTH / 2 - (WIDTH / 2 - realLeftX) * CAMERA_DIST_BEHIND / forwardDist;
			screenRightX = WIDTH / 2 - (WIDTH / 2 - realRightX) * CAMERA_DIST_BEHIND / forwardDist;
			newLeftCoord = { x: screenLeftX, y: screenY };
			newRightCoord = { x: screenRightX, y: screenY }
			polygonList.push({
				bLeft: prevLeftCoord,
				bRight: prevRightCoord,
				tLeft: newLeftCoord,
				tRight: newRightCoord,
				dark: currSeg.dark,
				roadObject: currSeg.roadObject
			})
			index++;
			prevLeftCoord = newLeftCoord;
			prevRightCoord = newRightCoord;
			firstOffset = 1;
			if (bottomIndex > 100) {
				var s = 2;
			}
		}
		if (polygonList && polygonList[0].tLeft.y > 0) {
			frame(polygonList, runner);
		}
		 //-10 to top Y so it covers road
		runner.updateState();
		if (offset > 0.1 && cont) { //0.25 accounts for fp errors
			setTimeout(drawWithOffset, 50, offset - 0.1);
		} else if (cont) {
			//reset offset to 1, increment bottom index
			const newVal = parseInt(SLIDER.value) + 1;
			SLIDER.value = newVal;
			//document.getElementById("timeElapsed").innerHTML = Math.floor(newVal / 60) + ":" + (newVal % 60).toString().padStart(2, "0");
			setTimeout(drawWithOffset, 50, 1);
		} else {
			latLons = Array();
			segments = Array();
			return
		}
	}
	// end animation loop
	drawWithOffset(1); //start width index at 1, offset at 1
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
		ctx.arc(WIDTH / 2, HEIGHT - shirtHeight - headRadius - this.state, headRadius, 0, Math.PI * 2);
		ctx.fill();
		//legs
		ctx.fillStyle = 'ForestGreen';
		ctx.fillRect(WIDTH / 2 - shirtWidth / 2, HEIGHT - this.state, shirtWidth, this.state);
		//left
		ctx.strokeStyle = "DarkOliveGreen";
		ctx.beginPath();
		ctx.lineWidth = 15;
		ctx.moveTo(WIDTH / 2 - shirtWidth / 2, armTop);
		ctx.lineTo(WIDTH / 2 - shirtWidth / 2 - armOut, armTop + this.armDown + 10);
		ctx.stroke();
		//right
		ctx.beginPath();
		ctx.moveTo(WIDTH / 2 + shirtWidth / 2, armTop);
		//					right arm height is "inverse" of left, 10 is a constant added
		ctx.lineTo(WIDTH / 2 + shirtWidth / 2 + armOut, armTop + (60 - this.armDown) + 10);
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
function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
	var R = 3958.8; // Radius of the earth in km
	var dLat = deg2rad(lat2 - lat1);  // deg2rad below
	var dLon = deg2rad(lon2 - lon1);
	var a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2)
		;
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c; // Distance in mi 
	return d;
}

function deg2rad(deg) {
	return deg * (Math.PI / 180)
}

