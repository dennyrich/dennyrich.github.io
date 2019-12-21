
function read() {
	document.getElementById("header").innerHTML = "File Uploaded..."
	const gpxFile = document.getElementById("GPX_file").files[0];
	var name = gpxFile.name;
	alert("file name: " + name + " file size: " + gpxFile.size);

	let parser = new DOMParser();



	


}



