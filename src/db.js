/** @format */

const mongoose = require("mongoose");
const { ts } = require("./utils");

let isConnected = false;

async function connectDB() {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error(`${ts()} ❌ MONGODB_URI missing from .env — bot cannot start without a database.`);
		console.error(`${ts()} 📚 See README.md → "MongoDB Setup" for the 3-minute Atlas walkthrough.`);
		process.exit(1);
	}

	try {
		mongoose.set("strictQuery", true);
		await mongoose.connect(uri, {
			serverSelectionTimeoutMS: 10000,
		});
		isConnected = true;
		console.log(`${ts()} 🗄️  Connected to MongoDB (${mongoose.connection.name})`);

		mongoose.connection.on("error", (err) => {
			console.error(`${ts()} ❌ MongoDB error:`, err.message);
		});
		mongoose.connection.on("disconnected", () => {
			isConnected = false;
			console.warn(`${ts()} ⚠️ MongoDB disconnected — mongoose will auto-reconnect.`);
		});
		mongoose.connection.on("reconnected", () => {
			isConnected = true;
			console.log(`${ts()} ✅ MongoDB reconnected.`);
		});
	} catch (err) {
		console.error(`${ts()} ❌ MongoDB connection failed:`, err.message);
		console.error(`${ts()} 📚 Check your MONGODB_URI in .env and verify the Atlas IP whitelist includes your machine.`);
		process.exit(1);
	}
}

function isDbConnected() {
	return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbConnected };
