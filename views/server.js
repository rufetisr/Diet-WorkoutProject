const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const app = express();

const bodyParser = require('body-parser');

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');


const { typeDefs, resolvers } = require('./graphql');



const port = process.argv[2];                                                                               

// data
let meals = [];
let workouts = [];

app.use(cors())
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- REST ROUTES ---


app.get('/view/new-meal', (req, res) => {
    res.render('new-meal', { submit_meal_url: '/submit/meal' });
});

app.get('/view/new-workout', (req, res) => {
    res.render('new-meal', { submit_workout_url: '/submit/workout' });
});

// POST - Add meal
app.post('/submit/meal', (req, res) => {
    const { name, calories } = req.body; 

    const meal = { id: Date.now(), name, calories };
    meals.push(meal);
    res.status(201).json(meal);
});

// POST - Add workout
app.post('/submit/workout', (req, res) => {
    const { name, duration, caloriesBurned } = req.body;

    if (!name || typeof duration !== 'number' || typeof caloriesBurned !== 'number') {
        return res.status(400).json({ message: 'Invalid workout input. "name", "duration", and "caloriesBurned" are required as numbers.' });
    }

    const workout = { id: Date.now(), name, duration, caloriesBurned };
    workouts.push(workout);
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

    // Basic validation: Check if the body is empty or contains no recognizable update fields
    const hasUpdateFields = name !== undefined || calories !== undefined;
    if (!hasUpdateFields) {
        return res.status(400).json({ message: 'No valid update fields provided (name, calories).' });
    }

    const index = meals.findIndex(m => m.id === id);
    if (index !== -1) {
        // Update fields only if they are provided in the request body
        if (name !== undefined) { // Check specifically for undefined to allow setting name to null or empty string
            meals[index].name = name;
        }
        if (calories !== undefined) { // Check specifically for undefined
            if (typeof calories === 'number') { // Ensure calories is a number
                 meals[index].calories = calories;
            } else {
                 return res.status(400).json({ message: 'Calories must be a number.' });
            }
        }
        // Return the updated meal object
        return res.json(meals[index]);
    } else {
        return res.status(404).json({ message: 'Meal not found with the given ID.' });
    }
});

// PUT - Update workout
app.put('/workout/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, duration, caloriesBurned } = req.body;

    // Basic validation: Check if the body is empty or contains no recognizable update fields
     const hasUpdateFields = name !== undefined || duration !== undefined || caloriesBurned !== undefined;
     if (!hasUpdateFields) {
        return res.status(400).json({ message: 'No valid update fields provided (name, duration, caloriesBurned).' });
    }


    const index = workouts.findIndex(w => w.id === id);
    if (index !== -1) {
        // Update fields only if they are provided in the request body
        if (name !== undefined) { // Check specifically for undefined
             workouts[index].name = name;
        }
        if (duration !== undefined) { // Check specifically for undefined
             if (typeof duration === 'number') { // Ensure duration is a number
                 workouts[index].duration = duration;
             } else {
                 return res.status(400).json({ message: 'Duration must be a number.' });
             }
        }
        if (caloriesBurned !== undefined) { // Check specifically for undefined
             if (typeof caloriesBurned === 'number') { // Ensure caloriesBurned is a number
                 workouts[index].caloriesBurned = caloriesBurned;
             } else {
                 return res.status(400).json({ message: 'CaloriesBurned must be a number.' });
             }
        }
        // Return the updated workout object
        return res.json(workouts[index]);
    } else {
        return res.status(404).json({ message: 'Workout not found with the given ID.' });
    }
});

// DELETE - Remove meal
app.delete('/meal/:id', (req, res) => {
    const id = parseInt(req.params.id);
    meals = meals.filter(m => m.id !== id);
    res.json({ message: 'Meal deleted' });
});

// DELETE - Remove workout
app.delete('/workout/:id', (req, res) => {
    const id = parseInt(req.params.id);
    workouts = workouts.filter(w => w.id !== id);
    res.json({ message: 'Workout deleted' });
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

    app.use('/graphql', expressMiddleware(server, {
        context: async () => ({ meals, workouts }),
    }));

    app.listen(port, () => {
        console.log(`🚀 REST server on http://localhost:${port}`);
        console.log(`🚀 GraphQL server on http://localhost:${port}/graphql`);
    });
}

startServer();