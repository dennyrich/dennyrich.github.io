var nameBound = document.getElementById("header").getBoundingClientRect();
var canvas = document.getElementById("canvasHome");
var canvasBound = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var x = nameBound.x - canvasBound.x;
var y = nameBound.y - canvasBound.y;
const FPSinverse = 25;

// var header = document.getElementById("header").getBoundingClientRect();
// var links = document.getElementById("home_links").getBoundingClientRect();
// var picture = document.getElementById("photo").getBoundingClientRect();
// var paragraph = document.getElementById("paragraph").getBoundingClientRect();

//canvas.style.bottom = picture.bottom;

const BREAK_POINT = {x : -1, y : -1}; //position does not exist on canvas

// window.addEventListener('scroll', function(e) {
//     ctx.clearRect(nameBound.x, nameBound.y, nameBound.width, nameBound.height);
//     nameBound = this.document.getElementById("header").getBoundingClientRect();
//     ctx.strokeRect(nameBound.x, nameBound.y, nameBound.width, nameBound.height);
//   });


  
var rects = new Array();
var sqLen = 5; //length of each square "pixel"
const NUM_ROWS = Math.floor(canvas.height / sqLen);
const NUM_COLS = Math.round(canvas.width / sqLen);
const leftUnmarked = 23;
const rightUnmarked = 36;
const topUnmarked = 1;
const bottomUnmarked = 15;
const l = 26;
const r = 33;
const t = 17;
const b = 18;
var continueAnimation = true;





for (let i = 0; i < NUM_ROWS; i++) {
    rects[i] = Array();
    for (let j = 0; j < NUM_COLS; j++) {
        const neverMarked = false;
        rects[i].push({
            x : j * sqLen,
            y : i * sqLen,
            marked : false,
            neverMarked : neverMarked
        });
        if (!neverMarked) {
            //ctx.strokeRect(j*sqLen, i*sqLen, sqLen, sqLen);
        }
    }
}

function drawHello(x, y) {
    const letterHeight = 10; //squares
    const letterWidth = 4;
    
    const letters = [
        {verticals : [0, letterWidth], horizontals : [letterHeight / 2]}, //H
        {verticals : [letterWidth + 2], horizontals : [0, letterHeight / 2, letterHeight - 1]}, //E
        {verticals : [2 * letterWidth + 4], horizontals : [letterHeight - 1]}, //L
        {verticals : [3 * letterWidth + 6], horizontals : [letterHeight - 1]}, //L
        {verticals : [4 * letterWidth + 8, 5 * letterWidth + 8], horizontals : [0, letterHeight - 1]} //0 drawn as []
    ]

    for (let l = 0; l < letters.length; l++) {
        for (let v = 0; v < letters[l].verticals.length; v++) {
            let j = letters[l].verticals[v] + x; //do this for each vertical in the letter
            for (let i = y; i < y + letterHeight; i++) { 
                rects[i][j].neverMarked = true;
                strokeAndFill(rects[i][j], "red");
            }
        }
        for (let h = 0; h < letters[l].horizontals.length; h++) {
            let i = letters[l].horizontals[h] + y;
            const letterStart = letters[l].verticals[0] + x;
            for (let j = letterStart; j < letterStart + letterWidth; j ++) {
                rects[i][j].neverMarked = true;
                strokeAndFill(rects[i][j], "red");
            }
        }
    }
    const periodX = x + 5 * letterWidth + 10;
    const periodY = y + letterHeight - 1;
    for (let i = periodY; i <= periodY + 1; i++) {
        for (let j = periodX; j <= periodX + 1; j++) {
            rects[i][j].neverMarked = true;
            strokeAndFill(rects[i][j], "red");
        }
    }
}

drawHello(15, 2);

function fillAndMark(rect) {
    ctx.fillRect(rect.x, rect.y, sqLen, sqLen);
    rect.marked = true;
}


// ctx.fillStyle = "blue";
var start = rects[10][10]; //change to random
start.marked = true;
var wave = Array();
wave.push(start);
wave.push(BREAK_POINT);
//window.onload = (event) => {console.log("hello"); waveFunc();};

var startTime;

function begin() {
    requestAnimationFrame(function() {pulse(0)});
}

var colors = [
    "#EFF8FB",
    "#EFF8FB",
    "#CEECF5",
    "#A9E2F3",
    "#81DAF5",
    "#58D3F7",
    "#2ECCFA",
    "#00BFFF",
];

function pulse(colorIndex) {
    if (!continueAnimation) {
        return;
    }
    startTime = startTime || Date.now();
    if (Date.now() - startTime < FPSinverse) {
        requestAnimationFrame(function() {pulse(colorIndex)});
        return;
    }
    while (wave.length > 0 && wave[0].x != BREAK_POINT.x) {
        var curr = wave.shift();
        addNeighborsToQueue(curr);
        var index;
        if (colorIndex > colors.length) {
            index = 2 * colors.length - colorIndex;
        } else {
            index = colorIndex;
        }
        strokeAndFill(curr, colors[index]);

    }
    // adds all neighbors of everything in queue and then a breakpoint
    // turns all the ones until breakPoint
    wave.shift(); //gets past break point
    wave.push(BREAK_POINT);
    if (wave.length == 1) {
        requestAnimationFrame( finish);
        const probe = rects[19][59];
        strokeAndFill(probe, "red");
        return;
    }
    startTime = 0; //so that it re
    requestAnimationFrame(function() {pulse((colorIndex + 1) % (colors.length * 2))});
}

function addNeighborsToQueue(currPos) {
    var currX = currPos.x;
    var currY = currPos.y;
    var maxX = currX + sqLen;
    var maxY = currY + sqLen;
    var minX = currX - sqLen;
    var minY = currY - sqLen;

    for (let x = minX; x <= maxX; x += sqLen) {
        for (let y = minY; y <= maxY; y += sqLen) {

            //x, y are canvas positions, i, j are indices into rects array
            var i = y / sqLen;
            var j = x / sqLen;

            if (i >= rects.length || j >= rects[0].length || i < 0 || j < 0) {
                continue;
            }
            var neighbor = rects[i][j];

            if (!rects[i][j].marked && !rects[i][j].neverMarked) {
                wave.push(neighbor);
                rects[i][j].marked = true;
            }
        }
    }
}

function strokeAndFill(rect, color) {
    if (!continueAnimation) {
        return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, sqLen, sqLen);
    //ctx.strokeRect(rect.x, rect.y, sqLen, sqLen);
}

function setStart() {
    var i = Math.floor(Math.random() * NUM_ROWS);
    var j = Math.floor(Math.random() * NUM_COLS);
    while (rects[i][j].neverMarked) {
        i = Math.floor(Math.random() * NUM_ROWS);
        j = Math.floor(Math.random() * NUM_COLS);
        if (rects[i][j].neverMarked) {
            i++;
            j++;
        }
    }
    return rects[i][j];
}

function finish() {
    for (let i = 0; i < rects.length; i++) {
        for (let j = 0; j <rects[0].length; j++) {
            if (!rects[i][j].neverMarked) {
                strokeAndFill(rects[i][j], "white");
                rects[i][j].marked = false;
            }
        }
    }
    //ctx.fillStyle = "blue";
    var start = setStart(); //change to random
    start.marked = true;
    wave = Array();
    wave.push(start);
    wave.push(BREAK_POINT);
    requestAnimationFrame(function() {pulse(0)});
}

function stopAnimation() {
    continueAnimation = false;
}




