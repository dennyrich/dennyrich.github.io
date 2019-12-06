
function read() {
	var gpxFile = document.getElementById("GPX_file");
	var name = gpxFile.name;
	alert(gpxFile.value.concat(" file len: ", gpxFile.len));

	//	
	var request = new XMLHttpRequest();
	
	request.open("GET", "testXML.xml", false);
	request.send();
	var xmlData = request.responseXML;
	//if no response xml
	if (!xmlData) {
		xmlData = (new DOMParser()).parseFromString(request.responseText, "text/xml");
	}
	var names = xmlData.getElementsByTagName("denny")[0].childNodes[0].nodeValue;
	alert(names);

}



