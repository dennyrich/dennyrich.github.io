var latLons = Array();
var world = Array();
var swBound, neBound, bound; //sw, ne, and google maps object bound
var path; //google maps object
var map;
var segments = Array();
var HEIGHT = document.getElementById("canvas").height; 
var WIDTH = document.getElementById("canvas").width;

const SCALE = 70000;
const MIN_LEN = 20;
const ELEV_SCALE = 5;
const CURVE_MAGNIFY = 2;

var clouds = Array();

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
//file name is null if file is uploaded
function read(gpxFile, fileName) {
	createClouds();
	//const gpxFile = document.getElementById("GPX_file").files[0];
	let text, xmlText;
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
		
		world.push([lat, lon, elev, time]); 
	
		

		latLons.push(new google.maps.LatLng(lat, lon));
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
		return  Math.atan((v1.x * v2.y - v1.y * v2.x) / (v1.x * v2.x + v1.y * v2.y));
	}
}


function createSegments(world) {
	var distX, distY, distElev, currVec, angleFromPrev, roadObject;
	var prevVec = new Vector(0, 0);
	
	var dark = true;
	const LEN = 60;
	var angle = 0;
	var len = 0;
	var changeElevScaled = 0;
	for (let i = 1; i < world.length; i++) {
	
		distX = world[i][0] - world[i - 1][0];
		distY = world[i][1] - world[i - 1][1];
		distElev = world[i][2] - world[i - 1][2];
		currVec = new Vector(distX, distY);
		angleFromPrev = Vector.angleBetween(prevVec, currVec); //order matters, check sign
		 // * 2 to amplify curve		
		changeElevScaled += distElev * ELEV_SCALE;
		len += currVec.magnitude() * SCALE;
		if (Number.isNaN(angleFromPrev)) {
			angleFromPrev = 0; //division by 0
		}
		angle += angleFromPrev;
		if (len < LEN / 3) {
			continue;
		}
		var curveAmount = Math.sin(angle) * LEN * CURVE_MAGNIFY;
		//world = list of [lat, lon, elev, time]

		segments.push({length : LEN + changeElevScaled, curve : curveAmount, dark : dark, 
							x 			: world[i][0], y : world[i][1],
							roadObject 	: roadObject,
							angle		: Math.atan(distY, distX)
						});
		prevVec = currVec;
		dark = !dark;
		curveAmount = 0;
		len = 0;
		angle = 0;
		changeElevScaled = 0;
	}
} 

//********************************************************************************** */
function run() {
	var runner = new Person();
	if (latLons.length == 0) {
		alert("no file uploaded or has incorrect data");
		return;
	}
	drawMap();
	const canvas = document.getElementById("canvas");
	ctx = canvas.getContext('2d');
	const DWIDTH_START = 160;
	const ddwidth = 35; //const over each road segment
	var dWidth = DWIDTH_START; //decreases from bottom segment to top segment
	var polyList, tLeftX, tRightX;
	/**
	 * takes current offset and bottom segment
	 */
	function drawWithOffset(offset, bottomIndex, prevTopMost) {
		const bottomSeg = segments[bottomIndex];
		polyList = Array();

		tLeftX = (dWidth * offset + bottomSeg.curve * offset);
		tRightX = (WIDTH - dWidth * offset + bottomSeg.curve * offset);
		let tY = HEIGHT -  bottomSeg.length * offset;

		map.setCenter(new google.maps.LatLng(bottomSeg.x,bottomSeg.y));
		
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(bottomSeg.x,bottomSeg.y),
			map: map,
			icon : {url : "/images/ant_freeze.gif", scaledSize : new google.maps.Size(30, 30)}
		  });
		  
		  setTimeout(function() {marker.setMap(null)}, 100);

		polyList.push({
			bLeft 	: {x : 0, 		y : HEIGHT},
			bRight  : {x : WIDTH, 	y : HEIGHT},
			tLeft  	: {x : tLeftX, 	y : tY},
			tRight	: {x : tRightX,	y : tY},
			dark 	: bottomSeg.dark,
			roadObject : bottomSeg.roadObject
		});
		var bLeftX, bRightX, currSeg, bY;
		var index = bottomIndex + 1;
		var heightDecr = 0;
		dWidth -= ddwidth;
		while(tRightX - tLeftX > dWidth * 2 && dWidth > 0 && tY > 0 && index < segments.length) {
			currSeg = segments[index];
			bLeftX = tLeftX;
			bRightX = tRightX;
			bY = tY; //bottomY = topY

			tLeftX += (dWidth + currSeg.curve);
			tRightX += (-dWidth + currSeg.curve);
			tY -= (currSeg.length - heightDecr);
			if (tY < prevTopMost) {
				tY = prevTopMost;
				index = segments.length; //to break after this loop
			}
			polyList.push({
				bLeft 	: {x : bLeftX, 	y : bY},
				bRight  : {x : bRightX, y : bY},
				tLeft  	: {x : tLeftX, 	y : tY},
				tRight	: {x : tRightX,	y : tY},
				dark	: currSeg.dark,
				roadObject : currSeg.roadObject
			});
			index++;
			dWidth -= ddwidth;
			heightDecr += 10;
			if (heightDecr > currSeg.length) {
				break;
			}
		}
		if (prevTopMost != -1) {
			tY = prevTopMost;
		}

		frame(polyList, tY - 15, runner); //-10 to top Y so it covers road
		runner.updateState();
		dWidth = DWIDTH_START;
		if (offset > 0.01) { //0.25 accounts for fp errors
			 setTimeout(drawWithOffset, 9, offset - 0.03, bottomIndex, tY, marker); 
		} else {
			//reset offset to 1, increment bottom index, -1 means topMost won't be used
			setTimeout(drawWithOffset, 9, 1, bottomIndex + 1, -1, marker); 
		}
	} 
	drawWithOffset(1, 1, -1); //start width index at 1, offset at 1
	//notSetUpYet();

}



// function notSetUpYet() {
// 	alert("not set up yet")
// 	ctx.font = "30px Arial";
// 	ctx.fillText("In Development.", 100, 50);
// 	ctx.fillText("Come Back Later!", 100, 150);
// }

function frame(polyList, topMost, runner) {
	//not used now
	const flower = document.getElementById("flower");
	const fWidth = document.getElementById("flower").width;
	const fHeight = document.getElementById("flower").height;
	var dim, img, width, height;
	// end not used now

	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	ctx.fillStyle = "Green";
	ctx.fillRect(0, topMost, WIDTH, HEIGHT - topMost);
	ctx.fillStyle = "Blue";
	ctx.fillRect(0, 0, WIDTH, topMost);
	var s = polyList[0];
	var color;
	for (let i = 0; i < polyList.length; i++) {
		if (polyList[i].dark){
			color = "black";
		} else {
			color = "grey";
		}
		drawPoly(polyList[i], color);
		//for objects on road
		// roadObject = polyList[i].roadObject;
		// if (roadObject) {
		// 	if (roadObject.name == "flower") {
		// 		img = flower;
		// 		dim = flower.height;
		// 		width = fWidth;
		// 		height = fHeight;
		// 	} 
		// 	var x;
		// 	if (roadObject.onLeft) {
		// 		x = polyList[i].bLeft.x - width - 100;
		// 	} else {
		// 		x = polyList[i].bRight.x + 100;
		// 	}
		// 	var y = polyList[i].bLeft.y + height;
		// 	drawRoadObject(img, {x : x, y : y}, dim);
		// }
	}
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
function createClouds() {
	for (let i = 0; i < 20; i++) {
		clouds.push({
			size : Math.random() * 100 + 10,
			angle : 18 * i // goes from 0 to 360
		});
	}
}
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

//**************************************************** */
const DIST = 20;
/**
 * returns points with distance apart DIST on spline 
 */

function spline(a, b, c) {
	if (!isFunction(a, b, c)) {
		transpose([a, b, c]);
	}
	var denom1 = (a.x - b.x) * (a.x - c.x);
	var denom2 = (b.x - a.x) * (b.x - c.x);
	var denom3 = (c.x - a.x) * (c.x - b.x);
	//num = (x - x[j]) * y[i] for j != i
	var num1 = function (inputX) {
			return (inputX - b.x) * (inputX - c.x) * a.y;
	}
	var num2 = function (inputX) {
		return (inputX - a.x) * (inputX - c.x) * b.y;
	}
	var num3 = function (inputX) {
		return (inputX - a.x) * (inputX - b.x) * c.y;
	}
	var points = Array();
	var currX = a.x;
	
	//to be continued
	//while there is a to get a name in rock and roll is to be there the whole time, and not know for when
}

function isFunction(a, b, c) {
	return (a.x < b.x && b.x < c.x) || (c.x < b.x && b.x < a.x);
}
function transpose(points) {
	for (const p in points) {
		var temp = p.x;
		p.x = p.y;
		p.y = temp;
	}
}
