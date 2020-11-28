const PACETIME = document.getElementById("paceTimePlot");
var frames = []
var x;
var y;
var maxY;
var prevX = 0;

function plotPaceVsTime(stream, isTrkseg) {


    y = stream["velocity_smooth"]["data"];
    if (!isTrkseg) {
        // m/s to mph
        y = y.map((i) => i * 2.237);
    }
    x = stream["time"]["data"];
    maxY = [0, Math.max.apply(Math, y)];
    Plotly.newPlot( PACETIME, [{
            //x: [x[0], x[1]],
            y: [y[0]],
            mode : "lines",
            fill : 'tozeroy',
            type : "scatter",
            line: {color: '#80CAF6'}
        }], 
        {
            margin: { t: 0, r:0, l:50, b:0} ,
            height : 150,
            xaxis : {
                type : 'seconds',
                range : [-1, x.length]
            },
            yaxis : {
                range : [0, maxY],
                title : "Veocity mph"
            }
        }
    );
}

function extendTrace(frameCount) {
    Plotly.extendTraces(PACETIME, {
        y : [y.slice(prevX, frameCount)]
    }, [0])
    prevX = frameCount;
}
