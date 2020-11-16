function encrypt(password, text, IV) {
	//len IV = len of Password
	var lenPassword = len(password);
	var lenText = len(text);
	var numBlocks = lenText / lenPassword;
	var lenPadding = lenText % lenPassword;

	prevBlock = IV
	for (var i = 0; i < numBlocks; i++) {
		
	}
}