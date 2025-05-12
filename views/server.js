const express = require('express');
const path = require('path');
const fs = require('fs'); // Import the file system module
require('dotenv').config();
const cors = require('cors');

const app = express();

const bodyParser = require('body-parser');

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const { typeDefs, resolvers } = require('./graphql');

const port = process.argv[2];

// --- File Storage Configuration ---
const dataDir = path.join(__dirname, 'data'); // Directory to store data files
const mealsFile = path.join(dataDir, 'meals.json');
const workoutsFile = path.join(dataDir, 'workouts.json');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// --- Data Variables (Initialized from file) ---
let meals = [];
let workouts = [];

// Function to load data from files
const loadData = () => {
    try {
        // Load meals
        if (fs.existsSync(mealsFile)) {
            const mealsData = fs.readFileSync(mealsFile, 'utf8');
            meals = mealsData ? JSON.parse(mealsData) : [];
            console.log('Meals data loaded from file.');
        } else {
            console.log('Meals data file not found. Starting with empty data.');
            meals = []; // Start with an empty array if the file doesn't exist
        }

        // Load workouts
        if (fs.existsSync(workoutsFile)) {
            const workoutsData = fs.readFileSync(workoutsFile, 'utf8');
            workouts = workoutsData ? JSON.parse(workoutsData) : [];
            console.log('Workouts data loaded from file.');
        } else {
            console.log('Workouts data file not found. Starting with empty data.');
            workouts = []; // Start with an empty array if the file doesn't exist
        }
    } catch (error) {
        console.error('Error loading data from files:', error);
        // If loading fails, ensure variables are empty arrays to prevent errors later
        meals = [];
        workouts = [];
    }
};

// Function to save meals data to file
const saveMeals = () => {
    try {
        fs.writeFileSync(mealsFile, JSON.stringify(meals, null, 2), 'utf8'); // Use 2 spaces for indentation
        // console.log('Meals data saved to file.'); // Optional: log every save
    } catch (error) {
        console.error('Error saving meals data to file:', error);
    }
};

// Function to save workouts data to file
const saveWorkouts = () => {
    try {
        fs.writeFileSync(workoutsFile, JSON.stringify(workouts, null, 2), 'utf8'); // Use 2 spaces for indentation
        // console.log('Workouts data saved to file.'); // Optional: log every save
    } catch (error) {
        console.error('Error saving workouts data to file:', error);
    }
};


// --- Middleware ---
app.use(cors())
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- REST ROUTES ---

// Load data when the application starts BEFORE routes are processed
loadData();


app.get('/view/new-meal', (req, res) => {
    res.render('new-meal', { submit_meal_url: '/submit/meal' });
});

app.get('/view/new-workout', (req, res) => {
    // NOTE: The original code renders 'new-meal' for new-workout. This might be a typo.
    // If you have a 'new-workout.ejs' file, change 'new-meal' to 'new-workout'.
    res.render('new-meal', { submit_workout_url: '/submit/workout' });
});

// POST - Add meal
app.post('/submit/meal', (req, res) => {
    const { name, calories } = req.body;

    if (!name || typeof calories !== 'number' || calories < 0) {
         return res.status(400).json({ message: 'Invalid meal input. "name" is required, and "calories" must be a non-negative number.' });
    }

    const meal = { id: Date.now(), name, calories };
    meals.push(meal);
    saveMeals(); // Save data after adding a meal
    res.status(201).json(meal);
});

// POST - Add workout
app.post('/submit/workout', (req, res) => {
    const { name, duration, caloriesBurned } = req.body;

    if (!name || typeof duration !== 'number' || duration <= 0 || typeof caloriesBurned !== 'number' || caloriesBurned < 0) {
        return res.status(400).json({ message: 'Invalid workout input. "name" is required, "duration" must be a positive number, and "caloriesBurned" must be a non-negative number.' });
    }

    const workout = { id: Date.now(), name, duration, caloriesBurned };
    workouts.push(workout);
    saveWorkouts(); // Save data after adding a workout
    res.status(201).json(workout);
});

app.get('/meals', (req, res) => {
    return res.status(200).json(meals)
})
app.get('/workouts', (req, res) => {
    return res.status(200).json(workouts)
})

// PUT - Update meal
app.put('/meal/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, calories } = req.body;

    const hasUpdateFields = name !== undefined || calories !== undefined;
    if (!hasUpdateFields) {
        return res.status(400).json({ message: 'No valid update fields provided (name, calories).' });
    }

    const index = meals.findIndex(m => m.id === id);
    if (index !== -1) {
        if (name !== undefined) {
            meals[index].name = name;
        }
        if (calories !== undefined) {
             if (typeof calories === 'number' && calories >= 0) {
                 meals[index].calories = calories;
            } else {
                 return res.status(400).json({ message: 'Calories must be a non-negative number.' });
            }
        }
        saveMeals(); // Save data after updating a meal
        return res.json(meals[index]);
    } else {
        return res.status(404).json({ message: 'Meal not found with the given ID.' });
    }
});

// PUT - Update workout
app.put('/workout/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, duration, caloriesBurned } = req.body;

     const hasUpdateFields = name !== undefined || duration !== undefined || caloriesBurned !== undefined;
     if (!hasUpdateFields) {
        return res.status(400).json({ message: 'No valid update fields provided (name, duration, caloriesBurned).' });
    }

    const index = workouts.findIndex(w => w.id === id);
    if (index !== -1) {
        if (name !== undefined) {
             workouts[index].name = name;
        }
        if (duration !== undefined) {
             if (typeof duration === 'number' && duration > 0) {
                 workouts[index].duration = duration;
             } else {
                 return res.status(400).json({ message: 'Duration must be a positive number.' });
             }
        }
        if (caloriesBurned !== undefined) {
             if (typeof caloriesBurned === 'number' && caloriesBurned >= 0) {
                 workouts[index].caloriesBurned = caloriesBurned;
             } else {
                 return res.status(400).json({ message: 'CaloriesBurned must be a non-negative number.' });
             }
        }
        saveWorkouts(); // Save data after updating a workout
        return res.json(workouts[index]);
    } else {
        return res.status(404).json({ message: 'Workout not found with the given ID.' });
    }
});

// DELETE - Remove meal
app.delete('/meal/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = meals.length;
    meals = meals.filter(m => m.id !== id);
    if (meals.length < initialLength) {
        saveMeals(); // Save data after deleting a meal
        res.json({ message: 'Meal deleted' });
    } else {
        res.status(404).json({ message: 'Meal not found with the given ID.' });
    }
});

// DELETE - Remove workout
app.delete('/workout/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = workouts.length;
    workouts = workouts.filter(w => w.id !== id);
    if (workouts.length < initialLength) {
        saveWorkouts(); // Save data after deleting a workout
        res.json({ message: 'Workout deleted' });
    } else {
         res.status(404).json({ message: 'Workout not found with the given ID.' });
    }
});


// --- GRAPHQL ---

async function startServer() {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    app.use((req, res, next) => {
        if (!req.body && process.env.NODE_ENV !== "production") {
            req.body = {}; // Prevent Apollo from failing on undefined/null req.body
        }
        next();
    });

    // Pass the *current* meals and workouts arrays to the GraphQL context
    // Note: If your GraphQL resolvers also modify data, they would need access
    // to the save functions as well (e.g., via context or importing).
    // The current resolvers are read-only based on the provided snippet.
    app.use('/graphql', expressMiddleware(server, {
        context: async () => ({ meals, workouts }),
    }));

    app.listen(port, () => {
        console.log(`🚀 REST server on http://localhost:${port}`);
        console.log(`🚀 GraphQL server on http://localhost:${port}/graphql`);
    });
}

startServer();