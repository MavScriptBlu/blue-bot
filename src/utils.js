/** @format */

// Returns a readable timestamp like "[5/22 2:35:21 PM]"
function ts() {
	const now = new Date();
	const date = `${now.getMonth() + 1}/${now.getDate()}`;
	const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
	return `[${date} ${time}]`;
}

module.exports = { ts };
