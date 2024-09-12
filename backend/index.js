const express = require('express');
const mongoose = require ('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');
require('dotenv').config();

const User = require('./models/User');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true
})
	.then(() => console.log('Connected to MongoDB Atlas!'))
	.catch((err) => console.log('Error connecting to MongoDB: ', err));

// ## Start
app.get('/', (req, res) => {
	res.send("RPG Backend API is running");
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});

// ## User Register
app.post('/api/register', async (req, res) => {
	const { username, password } = req.body;
	
	try {
		let user = await User.findOne({ username });
		if(user) {
			return res.status(400).json({ message: "Username already exists" });
		}
		
		user = new User({ username, password });
		await user.save();
		
		return res.status(200).json({ message: "User registered successfully." });
	} catch (error) {
		return res.status(500).json({ error: `Server error: ${error.message}` });
	}
});

// ## User Login
app.post('/api/login', async (req, res) => {
	const { username, password } = req.body;
	
	try {
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(400).json({ message: "Invalid username or password" });
		}
		
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid username or password" });
		}
		
		return res.status(200).json({ message: 'Login successful' });
		
	} catch (error) {
		return res.status(500).json({ error: `Server error: ${error.message}` });
	}
});

// ## Store User Progression
app.put('/api/character', async (req, res) => {
	const { username, characterData } = req.body;
	
	try {
		const user = await User.findOneAndUpdate({ username}, { characterData }, { new: true });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		
		res.status(200).json({ message: 'Character data updated', characterData: user.characterData });
	} catch (error) {
		res.status(500).json({ error: 'Server error' });
	}
});

// ## Fetch User Progression
app.get('/api/character/:username', async (req, res) => {
	try {
		const user = await User.findOne({ username: req.params.username });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		
		res.status(200).json({ characterData: user.characterData});
	} catch (error) {
		res.status(500).json({ error: `Server error: ${error.message}` });
	}
});

// ## Boilerplate AI Proxy Request
app.post('/api/generate', async (req, res) => {
	const { prompt } = req.body;
	
	try {
		const response = await axios.post('https://api.openai.com/v1/chat/completions', {
			model: 'gpt-4o',
			message: [{ role: 'system', content: 'You are a dungeon master' }, { role: 'user', content: prompt }]
		}, {
			headers: {
				'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
		});
		
		res.json(response.data);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: "Error generating scenario" });
	}
});