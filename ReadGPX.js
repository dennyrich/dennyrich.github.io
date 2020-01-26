var latLons = Array();
var world = Array();
var swBound; //southwest bound for map
var neBound; //northeast 
var bound; //google maps bound 
var segments = Array();
var road = Array();
const HEIGHT = 400; //must change canvas element if change height/width
const WIDTH = 600;

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

function createSegments(world) {
	var distX, distY, distElev, currVec, angleFromPrev;
	var prevVec = new Vector(0, 0);
	const scale = 100000;
	const elevScale = 10;
	//const curveScale = 3000;
	
	//var segPosY = HEIGHT;
	var dark = true;
	for (let i = 1; i < world.length; i++) {
		distX = world[i][0] - world[i - 1][0];
		distY = world[i][1] - world[i - 1][1];
		distElev = world[i][2] - world[i - 1][2];
		currVec = new Vector(distX, distY);
		//var len = scale * currVec.magnitude();
		var len = 40; //constant right now
		angleFromPrev = Vector.angleBetween(currVec, prevVec); //order matters, check sign
		var curveAmount = Math.sin(angleFromPrev) * len * 2; // * 2 to amplify curve		
		var changeElevScaled = distElev * elevScale;
		len += changeElevScaled;
		if (Number.isNaN(curveAmount)) {
			curveAmount = 0; //division by 0
		}
		//world = list of [lat, lon, elev, time]
		segments.push({length : len, curve : curveAmount, dark : dark});
		prevVec = currVec;
		dark = !dark;
	}
} 

//********************************************************************************** */
function run() {
	const canvas = document.getElementById("canvas");
	ctx = canvas.getContext('2d');
	const ddwidth = 5; //const over each road segment
	var dWidth = 30; //decreases from bottom segment to top segment
	//var width = WIDTH - dWidth; //start at bottom canvas width
	var polyList, tLeftX, tRightX;
	/**
	 * takes current offset and bottom segment
	 */
	function drawWithOffset(offset, bottomIndex) {
		const bottomSeg = segments[bottomIndex];
		polyList = Array();

		tLeftX = (dWidth * offset + bottomSeg.curve * offset);
		tRightX = (WIDTH - dWidth * offset + bottomSeg.curve * offset);
		let tY = HEIGHT -  bottomSeg.length * offset;
		
		polyList.push({
			bLeft 	: {x : 0, 		y : HEIGHT},
			bRight  : {x : WIDTH, 	y : HEIGHT},
			tLeft  	: {x : tLeftX, 	y : tY},
			tRight	: {x : tRightX,	y : tY}
		});
		var bLeftX, bRightX, currSeg, bY;
		var index = bottomIndex;
		dWidth -= ddwidth;
		while(tRightX - tLeftX > 50 && dWidth > 0 && tY > 0 && index < segments.length) {
			currSeg = segments[index];
			bLeftX = tLeftX;
			bRightX = tRightX;
			bY = tY; //bottomY = topY

			tLeftX += (dWidth + currSeg.curve);
			tRightX += (-dWidth + currSeg.curve);
			tY -= currSeg.length;
			polyList.push({
				bLeft 	: {x : bLeftX, 	y : bY},
				bRight  : {x : bRightX, y : bY},
				tLeft  	: {x : tLeftX, 	y : tY},
				tRight	: {x : tRightX,	y : tY},
				dark	: currSeg.dark
			});
			index++;
			dWidth -= ddwidth;
		}
		frame(polyList, tY);
		dWidth = 60;
		if (offset > 0.1) { //0.25 accounts for fp errors
			 setTimeout(drawWithOffset, 50, offset - 0.1, bottomIndex);
		} else {
			//reset offset to 1, increment bottom index
			setTimeout(drawWithOffset, 50, 1, bottomIndex + 1); 
		}
	} 
	drawWithOffset(1, 1); //start width index at 1, offset at 1
	//notSetUpYet();

}



function notSetUpYet() {
	alert("not set up yet")
	ctx.font = "30px Arial";
	ctx.fillText("In Development.", 100, 50);
	ctx.fillText("Come Back Later!", 100, 150);
}

function frame(polyList, topMost) {
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	ctx.fillStyle = "Green";
	ctx.fillRect(0, topMost, WIDTH, HEIGHT - topMost);
	var s = polyList[0];
	var color;
	for (let i = 0; i < polyList.length; i++) {
		if (polyList[i].dark){
			color = "black";
		} else {
			color = "grey";
		}
		drawPoly(polyList[i], color);
	}
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
//*************************************************** ****** ****** */
