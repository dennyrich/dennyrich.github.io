var latLons = Array();
var world = Array();
var swBound; //southwest bound for map
var neBound; //northeast 
var bound; //google maps bound 
var segments = Array();
var road = Array();
const HEIGHT = 300; //must change canvas element if change height/width
const WIDTH = 300;

//const canvas = document.getElementById("canvas");
var ctx;

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
//**************************************************************************/
//file name is null if file is uploaded
function read(gpxFile, fileName) {
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
	document.getElementById("header").innerHTML = "File Uploaded..."
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
	createSegments(world);
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
		//const cosAngle =  (v1.x * v2.x + v1.y * v2.y) / (v1.magnitude() * v2.magnitude());
		//(x1*y2-y1*x2,x1*x2+y1*y2);
		return  Math.atan((v1.x * v2.y - v1.y * v2.x) / (v1.x * v2.x + v1.y * v2.y));
	}
}

class Polygon {
	//all Vectors
	constructor(bLeft, bRight, tLeft, tRight) {
		this.bLeft = bLeft;
		this.bRight = bRight;
		this.tLeft = tLeft;
		this.tRight = tRight;
	}
	getPolyAbove(curve, len, dWidth) {
		const bLeft = this.tLeft;
		const bRight = this.tRight;
		const tLeft = new Vector(this.tLeft.x + dWidth + curve, this.tLeft.y + len);
		const tRight = new Vector(this.tRight.x - dWidth + curve, this.tRight.y + len);
		return new Polygon(bLeft, bRight, tLeft, tRight);
	}
}

class sides {
	constructor(left, right) {
		this.left = left;
		this.right = right;
		this.distToNext = distToNext;
	}
}
function createSegments(world) {
	var distX;
	var distY;
	var distElev;
	var currVec;
	var prevVec;
	//var prevDistX = 0;
	//var prevDistY = 0;
	var angleFromPrev;
	var prevVec = new Vector(0, 0);
	const scale = 1000;
	const elevScale = 10;
	//var segPosY = HEIGHT;
	for (let i = 1; i < world.length; i++) {
		distX = world[i][0] - world[i - 1][0];
		distY = world[i][1] - world[i - 1][1];
		distElev = world[i][2] - world[i - 1][2];
		currVec = new Vector(distX, distY);
		//angleFromPrev = Vector.angleBetween();

		var len = scale * currVec.magnitude();
		angleFromPrev = Vector.angleBetween(currVec, prevVec); //order matters, check sign
		var curve;
		if (Math.abs(angleFromPrev) > Math.PI) {
			curve = 4 * Math.sign(angleFromPrev);
		} else if (Math.abs(angleFromPrev) > Math.PI / 2) {
			curve = 3 * Math.sign(angleFromPrev);
		} else if (Math.abs(angleFromPrev > Math.PI/4)) {
			curve = 2 * Math.sign(angleFromPrev);
		} else if (Math.abs(angleFromPrev) > Math.PI/16) {
			curve = Math.sign(angleFromPrev);
		} else { //includes NaN when delta x = 0
			curve = 0;
		}

		var changeElevScaled = distElev * elevScale;
		len += changeElevScaled;
		//world = list of [lat, lon, elev, time]
		segments.push({
			length : len,
			curveAmount : curve,
			draw : function(bLeft, bRight, scale, offset) {
				//scale should be 1 at bottom and decrease
				const dWidth = 10;
				var tLeft = new Vector(bLeft.x + scale * (0.5 * dWidth + this.curveAmount), bLeft.y - scale * this.length);
				var tLeft = new Vector(bRight.x + scale * (0.5 * -dWidth + this.curveAmount), bRight.y - scale * this.length);
			}
		});

		prevVec = currVec;
	}
} 


function createRoad(segments) {
	var widths = Array
	for (const seg in segments) {

	}
}

//********************************************************************************** */
function run() {
	const canvas = document.getElementById("canvas");
	ctx = canvas.getContext('2d');


	



	//testing
	// var p = new Polygon(new Vector(100, HEIGHT), new Vector(200, HEIGHT), new Vector(125, HEIGHT - 100), new Vector(175, HEIGHT - 100));
	// drawPoly(p);
	notSetUpYet();
}

function notSetUpYet() {
	alert("not set up yet")
	ctx.font = "30px Arial";
	ctx.fillText("In Development.", 100, 50);
	ctx.fillText("Come Back Later!", 100, 150);
}

function frame(polyList, offsetIntoFirst) {
	for (const p in polyList) {
		drawPoly(p);
	}
}

function drawPoly(polygon) {
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
	ctx.fill();
}
//*************************************************** */

function runner() {


}
